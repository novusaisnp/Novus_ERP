// Edge Function: enviar-convite-usuario
// Envia convite (magic link) para o e-mail do usuário criado. Requer que o
// chamador esteja autenticado E possua o papel 'admin' (defesa server-side
// contra escalonamento de privilégio). Só após validação executa inviteUserByEmail.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  usuario_id?: string;
  email?: string;
  nome?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- AuthN: exige bearer token ---
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ invited: false, message: 'Autenticação obrigatória.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(
        JSON.stringify({ invited: false, message: 'Backend não configurado.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cliente com o JWT do chamador para descobrir uid.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ invited: false, message: 'Sessão inválida.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const callerUid = claimsData.claims.sub as string;

    // --- AuthZ: exige role admin ---
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: callerUid,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) {
      return new Response(
        JSON.stringify({ invited: false, message: 'Acesso negado: requer perfil admin.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Validação de entrada ---
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email || '').trim().toLowerCase();
    const usuarioId = (body.usuario_id || '').trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(
        JSON.stringify({ invited: false, message: 'E-mail inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!usuarioId) {
      return new Response(
        JSON.stringify({ invited: false, message: 'usuario_id ausente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { usuario_id: usuarioId, nome: body.nome || null },
    });

    if (error) {
      console.error('[enviar-convite-usuario] inviteUserByEmail error:', error.message);
      return new Response(
        JSON.stringify({
          invited: false,
          message: error.message || 'Falha ao enviar convite (verifique o provedor de e-mail).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // inviteUserByEmail já cria (ou retorna) o auth.users correspondente ao e-mail —
    // vincula aqui em vez de deixar pessoa_pendente/user_id travados até um passo
    // futuro que nunca existiu no fluxo (nada mais no código faz esse UPDATE).
    if (data?.user?.id) {
      const { error: linkError } = await admin
        .from('usuarios')
        .update({ user_id: data.user.id, pessoa_pendente: false })
        .eq('id', usuarioId)
        .is('user_id', null);
      if (linkError) {
        console.error('[enviar-convite-usuario] falha ao vincular user_id:', linkError.message);
      }
    }

    return new Response(
      JSON.stringify({
        invited: true,
        message: 'Convite enviado.',
        auth_user_id: data?.user?.id ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[enviar-convite-usuario] erro inesperado:', err);
    return new Response(
      JSON.stringify({ invited: false, message: 'Erro inesperado ao enviar convite.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
