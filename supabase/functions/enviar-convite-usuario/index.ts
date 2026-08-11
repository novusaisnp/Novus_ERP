// Edge Function: enviar-convite-usuario
// Provisiona acesso de um usuário criado no ERP. Senha temporária = o próprio
// e-mail (login com e-mail nos dois campos é uma autenticação real) — elimina
// a dependência de e-mail transacional funcionando (o convite antigo via
// inviteUserByEmail nunca tinha página que tratasse a sessão resultante, e
// esbarrava no limite do Resend sandbox). Requer chamador autenticado com
// papel 'admin' (defesa server-side contra escalonamento de privilégio).
//
// mode: 'create' (padrão) cria o auth.users + vincula usuarios + grava
// user_roles. mode: 'reset' redefine a senha de um usuário já existente e
// marca pessoa_pendente novamente, pro botão "Resetar senha" da tela de
// Usuários.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  usuario_id?: string;
  email?: string;
  nome?: string;
  empresa_representada_id?: string;
  role?: string;
  mode?: 'create' | 'reset';
}

const ALLOWED_ROLES = ['admin', 'gerente', 'operador', 'visualizador'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- AuthN: exige bearer token ---
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Autenticação obrigatória.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Backend não configurado.' }),
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
        JSON.stringify({ ok: false, message: 'Sessão inválida.' }),
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
        JSON.stringify({ ok: false, message: 'Acesso negado: requer perfil admin.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Validação de entrada ---
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = (body.email || '').trim().toLowerCase();
    const usuarioId = (body.usuario_id || '').trim();
    const mode = body.mode === 'reset' ? 'reset' : 'create';

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(
        JSON.stringify({ ok: false, message: 'E-mail inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!usuarioId) {
      return new Response(
        JSON.stringify({ ok: false, message: 'usuario_id ausente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (mode === 'reset') {
      const resetRole = (body.role || '').trim();
      if (!ALLOWED_ROLES.includes(resetRole)) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Role inválido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { data: usuario, error: fetchError } = await admin
        .from('usuarios')
        .select('user_id, empresa_representada_id')
        .eq('id', usuarioId)
        .single();

      if (fetchError || !usuario?.user_id) {
        return new Response(
          JSON.stringify({ ok: false, message: 'Usuário não encontrado ou ainda sem conta vinculada.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: updateAuthError } = await admin.auth.admin.updateUserById(usuario.user_id, {
        password: email,
      });
      if (updateAuthError) {
        console.error('[enviar-convite-usuario] falha ao resetar senha:', updateAuthError.message);
        return new Response(
          JSON.stringify({ ok: false, message: updateAuthError.message || 'Falha ao resetar senha.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const { error: pendingError } = await admin
        .from('usuarios')
        .update({ pessoa_pendente: true })
        .eq('id', usuarioId);
      if (pendingError) {
        console.error('[enviar-convite-usuario] falha ao marcar pessoa_pendente:', pendingError.message);
      }

      // Auto-repara contas criadas pelo fluxo antigo (que nunca gravava
      // user_roles) — resetar senha também garante o vínculo de empresa,
      // sem precisar de patch manual em banco pra cada caso legado.
      const { error: roleUpsertError } = await admin
        .from('user_roles')
        .upsert(
          { user_id: usuario.user_id, role: resetRole, empresa_representada_id: usuario.empresa_representada_id },
          { onConflict: 'user_id,empresa_representada_id,role', ignoreDuplicates: true },
        );
      if (roleUpsertError) {
        console.error('[enviar-convite-usuario] falha ao reparar user_roles no reset:', roleUpsertError.message);
      }

      return new Response(
        JSON.stringify({ ok: true, message: 'Senha redefinida.', auth_user_id: usuario.user_id, mode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- mode === 'create' ---
    const empresaId = (body.empresa_representada_id || '').trim();
    const role = (body.role || '').trim();
    if (!empresaId) {
      return new Response(
        JSON.stringify({ ok: false, message: 'empresa_representada_id ausente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Role inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let authUserId: string | null = null;
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
      user_metadata: { usuario_id: usuarioId, nome: body.nome || null },
    });

    if (createError) {
      const alreadyExists = /already.*registered|already.*exists/i.test(createError.message || '');
      if (!alreadyExists) {
        console.error('[enviar-convite-usuario] createUser error:', createError.message);
        return new Response(
          JSON.stringify({ ok: false, message: createError.message || 'Falha ao criar acesso.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      // E-mail já tem auth.users (ex.: usuário travado de uma tentativa antiga
      // via invite) — localiza e trata como reset em vez de falhar.
      let page = 1;
      const perPage = 200;
      while (!authUserId) {
        const { data: listData, error: listError } = await admin.auth.admin.listUsers({ page, perPage });
        if (listError || !listData?.users?.length) break;
        const found = listData.users.find((u) => u.email?.toLowerCase() === email);
        if (found) {
          authUserId = found.id;
          break;
        }
        if (listData.users.length < perPage) break;
        page += 1;
      }
      if (!authUserId) {
        return new Response(
          JSON.stringify({ ok: false, message: 'E-mail já cadastrado, mas não foi possível localizar a conta.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const { error: updateAuthError } = await admin.auth.admin.updateUserById(authUserId, { password: email });
      if (updateAuthError) {
        console.error('[enviar-convite-usuario] falha ao redefinir senha de conta existente:', updateAuthError.message);
      }
    } else {
      authUserId = createData?.user?.id ?? null;
    }

    if (!authUserId) {
      return new Response(
        JSON.stringify({ ok: false, message: 'Falha ao provisionar acesso.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: linkError } = await admin
      .from('usuarios')
      .update({ user_id: authUserId, pessoa_pendente: true })
      .eq('id', usuarioId);
    if (linkError) {
      console.error('[enviar-convite-usuario] falha ao vincular user_id:', linkError.message);
    }

    const { error: roleInsertError } = await admin
      .from('user_roles')
      .upsert(
        { user_id: authUserId, role, empresa_representada_id: empresaId },
        { onConflict: 'user_id,empresa_representada_id,role', ignoreDuplicates: true },
      );
    if (roleInsertError) {
      console.error('[enviar-convite-usuario] falha ao gravar user_roles:', roleInsertError.message);
    }

    return new Response(
      JSON.stringify({ ok: true, message: 'Acesso criado.', auth_user_id: authUserId, mode }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[enviar-convite-usuario] erro inesperado:', err);
    return new Response(
      JSON.stringify({ ok: false, message: 'Erro inesperado ao provisionar acesso.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
