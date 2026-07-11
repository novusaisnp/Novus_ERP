// Edge Function: enviar-convite-usuario
// Envia convite (magic link) para o e-mail do usuário criado e mantém user_id NULL
// até o aceite. Não falha o fluxo principal se o SMTP não estiver configurado —
// retorna { invited: false, message } para tratamento gracioso pelo frontend.

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRole) {
      return new Response(
        JSON.stringify({ invited: false, message: 'Backend não configurado para envio de convite.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
