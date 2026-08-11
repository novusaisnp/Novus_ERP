// Edge Function: financeiro-autorizar
//
// Emite o ticket que libera uma operação financeira sensível: baixa retroativa além de
// 24h, estorno e cancelamento. O solicitante já está autenticado; o autorizador prova
// quem é digitando e-mail e senha no diálogo.
//
// A validação da senha acontece aqui, e não no Postgres, de propósito: senha como
// parâmetro de função SQL apareceria em `pg_stat_statements` e nos logs de query. Para o
// banco só viaja o ticket, de uso único e vida curta.
//
// O autorizador pode ser o próprio solicitante, desde que tenha a permissão — empresa de
// uma pessoa só continua operando, e o registro de auditoria é gravado do mesmo jeito.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type Acao = 'LIQUIDACAO_RETROATIVA' | 'ESTORNO' | 'CANCELAMENTO';

interface Body {
  acao?: Acao;
  email?: string;
  senha?: string;
  justificativa?: string;
  contexto?: Record<string, unknown>;
  /** Empresa ativa escolhida na aplicação. Papéis que operam acima de uma empresa não têm
   *  vínculo fixo em `usuarios`, então a empresa vem de quem está operando. */
  empresa_representada_id?: string;
}

// Permissão exigida do autorizador em cada ação.
const PERMISSAO_POR_ACAO: Record<Acao, string> = {
  LIQUIDACAO_RETROATIVA: 'financeiro.lancamentoRetroativo',
  ESTORNO: 'financeiro.estorno',
  CANCELAMENTO: 'financeiro.cancelamento',
};

const VALIDADE_MINUTOS = 5;
const JUSTIFICATIVA_MINIMA = 5;

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return json(401, { ok: false, message: 'Autenticação obrigatória.' });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRole) {
      return json(500, { ok: false, message: 'Backend não configurado.' });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const { acao, email, senha, justificativa, contexto } = body;
    const empresaSolicitada = (body.empresa_representada_id || '').trim();

    if (!acao || !PERMISSAO_POR_ACAO[acao]) {
      return json(400, { ok: false, message: 'Ação inválida.' });
    }
    if (!email || !senha) {
      return json(400, { ok: false, message: 'Informe e-mail e senha do autorizador.' });
    }
    if (!justificativa || justificativa.trim().length < JUSTIFICATIVA_MINIMA) {
      return json(400, {
        ok: false,
        message: `Justificativa deve ter ao menos ${JUSTIFICATIVA_MINIMA} caracteres.`,
      });
    }

    // --- Quem está pedindo ---
    const comoSolicitante = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: erroClaims } = await comoSolicitante.auth.getClaims(token);
    const solicitanteId = claims?.claims?.sub as string | undefined;
    if (erroClaims || !solicitanteId) {
      return json(401, { ok: false, message: 'Sessão inválida.' });
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: usuarioSolicitante } = await admin
      .from('usuarios')
      .select('empresa_representada_id')
      .eq('user_id', solicitanteId)
      .maybeSingle();

    const empresaDoVinculo = usuarioSolicitante?.empresa_representada_id ?? null;

    const podeOperarAcimaDaEmpresa = async (userId: string) => {
      const { data: ehAdmin } = await admin.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });
      if (ehAdmin === true) return true;
      const { data: ehOwner } = await admin.rpc('has_role', {
        _user_id: userId,
        _role: 'novus_owner',
      });
      return ehOwner === true;
    };

    // A autorização vale para a empresa em que se está operando. Quem tem vínculo fixo só
    // opera nele; papéis acima da empresa podem operar na empresa ativa que informarem.
    let empresaId = empresaDoVinculo;
    if (empresaSolicitada && empresaSolicitada !== empresaDoVinculo) {
      if (!(await podeOperarAcimaDaEmpresa(solicitanteId))) {
        return json(403, { ok: false, message: 'Sem acesso à empresa informada.' });
      }
      empresaId = empresaSolicitada;
    }

    if (!empresaId) {
      return json(400, { ok: false, message: 'Empresa da operação não identificada.' });
    }

    // --- Quem está autorizando ---
    // Cliente separado e sem persistência de sessão: validar a senha do autorizador não
    // pode substituir a sessão de quem está operando.
    const paraValidar = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: login, error: erroLogin } = await paraValidar.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (erroLogin || !login?.user) {
      // Mensagem genérica de propósito: não revela se o e-mail existe.
      return json(401, { ok: false, message: 'Credenciais inválidas.' });
    }
    const autorizadorId = login.user.id;
    await paraValidar.auth.signOut().catch(() => {});

    // --- O autorizador pode mesmo autorizar isso? ---
    const { data: pode, error: erroPermissao } = await admin.rpc('financeiro_pode_usuario', {
      p_user_id: autorizadorId,
      p_acao: PERMISSAO_POR_ACAO[acao],
    });

    if (erroPermissao) {
      return json(500, { ok: false, message: 'Falha ao verificar permissão.' });
    }
    if (pode !== true) {
      return json(403, {
        ok: false,
        message: 'Usuário informado não tem permissão para autorizar esta operação.',
      });
    }

    // O autorizador precisa ser da mesma empresa, salvo papéis que operam acima dela.
    const { data: usuarioAutorizador } = await admin
      .from('usuarios')
      .select('empresa_representada_id')
      .eq('user_id', autorizadorId)
      .maybeSingle();

    if (
      usuarioAutorizador?.empresa_representada_id !== empresaId &&
      !(await podeOperarAcimaDaEmpresa(autorizadorId))
    ) {
      return json(403, { ok: false, message: 'Autorizador não pertence a esta empresa.' });
    }

    // --- Emite o ticket ---
    const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60_000).toISOString();
    const { data: autorizacao, error: erroInsert } = await admin
      .from('autorizacoes_financeiras')
      .insert({
        empresa_representada_id: empresaId,
        acao,
        solicitante_user_id: solicitanteId,
        autorizador_user_id: autorizadorId,
        justificativa: justificativa.trim(),
        contexto: contexto ?? {},
        expira_em: expiraEm,
      })
      .select('ticket, expira_em')
      .single();

    if (erroInsert || !autorizacao) {
      return json(500, { ok: false, message: 'Falha ao registrar autorização.' });
    }

    return json(200, {
      ok: true,
      ticket: autorizacao.ticket,
      expira_em: autorizacao.expira_em,
    });
  } catch (_e) {
    // Nunca ecoar o erro cru: o corpo desta requisição contém senha.
    return json(500, { ok: false, message: 'Erro inesperado ao autorizar.' });
  }
});
