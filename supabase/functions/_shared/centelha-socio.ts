// Contexto comum das portas 0.1 (provisionar) e 0.2 (revogar): autenticar o chamador,
// carregar o sócio/representante, garantir o isolamento entre empresas e resolver quais
// satélites estão licenciados para o responsável daquela empresa.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { LicencaBruta } from './centelha-fanout.ts';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

export interface SocioResolvido {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  empresa_representada_id: string;
}

export interface ContextoSocio {
  supabase: SupabaseClient;
  socio: SocioResolvido;
  responsavelId: string;
}

export interface Falha {
  erro: string;
  status: number;
}

function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? '').replace(/\D/g, '');
}

/**
 * Autentica o chamador, carrega o sócio e confirma que quem chama é admin da empresa dona
 * dele. Isolamento entre empresas é requisito de primeira classe: "achou o registro" nunca
 * é autorização suficiente.
 *
 * `exigirAtivo` é true ao provisionar (não se dá acesso a sócio desligado) e false ao
 * revogar (revogar sócio já inativo é justamente o caso normal).
 */
export async function carregarSocioAutorizado(
  req: Request,
  socioId: string | undefined,
  opcoes: { exigirAtivo: boolean },
): Promise<ContextoSocio | Falha> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { erro: 'Token de autenticação requerido', status: 401 };
  }
  if (!socioId) {
    return { erro: 'Campo obrigatório: socio_id', status: 400 };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );
  if (userError || !userData.user) {
    return { erro: 'Usuário não autenticado', status: 401 };
  }

  // `socios_representantes` foi dropada no cutover pra `entidades`/`entidade_papeis`
  // (20260810231500_backfill_cutover_socios_colaboradores.sql) — o ID de sócio de hoje
  // é um `entidades.id`, com o papel confirmado à parte (entidade pode acumular outros
  // papéis, ex. COLABORADOR, sem deixar de ser sócio).
  const { data: socio, error: socioError } = await supabase
    .from('entidades')
    .select('id, nome, email, cpf, ativo, empresa_representada_id')
    .eq('id', socioId)
    .is('deleted_at', null)
    .maybeSingle();
  if (socioError || !socio) {
    return { erro: 'Sócio/representante não encontrado', status: 404 };
  }
  const { data: papeisSocio, error: papelError } = await supabase
    .from('entidade_papeis')
    .select('papel')
    .eq('entidade_id', socioId)
    .in('papel', ['SOCIO', 'REPRESENTANTE_LEGAL', 'PROCURADOR']);
  if (papelError || !papeisSocio || papeisSocio.length === 0) {
    return { erro: 'Sócio/representante não encontrado', status: 404 };
  }
  if (opcoes.exigirAtivo && !socio.ativo) {
    return { erro: 'Sócio/representante inativo não recebe acesso', status: 409 };
  }
  if (!socio.email?.trim()) {
    return { erro: 'Sócio/representante sem e-mail cadastrado', status: 422 };
  }

  // `has_role_for_empresa` já libera novus_owner.
  const { data: ehAdmin } = await supabase.rpc('has_role_for_empresa', {
    _user_id: userData.user.id,
    _role: 'admin',
    _empresa_id: socio.empresa_representada_id,
  });
  if (!ehAdmin) {
    return {
      erro: 'Apenas administradores desta empresa podem gerenciar o acesso de sócios',
      status: 403,
    };
  }

  const { data: representada, error: representadaError } = await supabase
    .from('empresas_representadas')
    .select('id, responsavel_id')
    .eq('id', socio.empresa_representada_id)
    .maybeSingle();
  if (representadaError || !representada) {
    return { erro: 'Empresa representada não encontrada', status: 404 };
  }
  if (!representada.responsavel_id) {
    return {
      erro: 'Empresa representada sem responsável vinculado — nenhum satélite licenciado',
      status: 409,
    };
  }

  return {
    supabase,
    responsavelId: representada.responsavel_id,
    socio: {
      id: socio.id,
      nome: socio.nome,
      email: socio.email.trim().toLowerCase(),
      cpf: apenasDigitos(socio.cpf),
      empresa_representada_id: socio.empresa_representada_id,
    },
  };
}

export async function listarLicencasAtivas(
  supabase: SupabaseClient,
  responsavelId: string,
): Promise<{ rows: LicencaBruta[] } | Falha> {
  const { data, error } = await supabase
    .schema('centelha')
    .from('licencas')
    .select('tenant_ref, satelites:satelite_id (codigo, base_url, provisioning_secret, ativo)')
    .eq('responsavel_id', responsavelId)
    .eq('status', 'ativa');

  if (error) {
    console.error('Falha ao listar licenças:', error);
    return { erro: 'Falha ao listar satélites licenciados', status: 500 };
  }

  return { rows: (data ?? []) as unknown as LicencaBruta[] };
}
