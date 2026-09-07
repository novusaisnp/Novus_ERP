// Recebe upload de certificado digital A1 (.pfx) do frontend, guarda no bucket
// privado `fiscal-certificados` e grava metadados em `public.fiscal_certificados`.
// A senha do certificado é armazenada em Secret (nunca no banco).
//
// Autorização: apenas admins. Executa como usuário autenticado — RLS + has_role garantem.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';

interface UploadPayload {
  empresa_representada_id: string;
  filename: string;
  content_base64: string; // .pfx binário em base64
  senha_secret_ref: string; // nome do Secret onde a senha está armazenada (ex.: FISCAL_CERT_PWD_<empresa>)
  valido_ate?: string; // ISO — cliente pode extrair do certificado
  valido_de?: string;
  thumbprint?: string;
  cn_subject?: string;
}

const MAX_BYTES = 512 * 1024; // 512KB é folgado para .pfx

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

    if (!await hasEveryPermission(client, userData.user.id, ['config.empresas'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const body = (await req.json()) as UploadPayload;
    const errors: string[] = [];
    if (!body?.empresa_representada_id) errors.push('empresa_representada_id');
    if (!body?.filename?.endsWith('.pfx') && !body?.filename?.endsWith('.p12')) errors.push('filename(.pfx/.p12)');
    if (!body?.content_base64) errors.push('content_base64');
    if (!body?.senha_secret_ref) errors.push('senha_secret_ref');
    if (errors.length) return json({ error: 'invalid_input', missing: errors }, 400);

    // decode + tamanho
    let buf: Uint8Array;
    try {
      const bin = atob(body.content_base64);
      buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    } catch {
      return json({ error: 'invalid_base64' }, 400);
    }
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      return json({ error: 'invalid_size', max_bytes: MAX_BYTES }, 400);
    }

    // Confirma que a Secret referenciada existe (evita registro órfão).
    if (!Deno.env.get(body.senha_secret_ref)) {
      return json({ error: 'senha_secret_ref_not_found', hint: `Cadastre o Secret ${body.senha_secret_ref} antes do upload.` }, 400);
    }

    const timestamp = Date.now();
    const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${body.empresa_representada_id}/${timestamp}-${safeName}`;

    const { error: upErr } = await client.storage
      .from('fiscal-certificados')
      .upload(storagePath, buf, {
        contentType: 'application/x-pkcs12',
        upsert: false,
      });
    if (upErr) {
      console.error('[fiscal-upload-certificado] upload storage falhou', upErr);
      return json({ error: 'storage_upload_failed', details: upErr.message }, 500);
    }

    // Desativa certificados anteriores da mesma empresa
    await client
      .from('fiscal_certificados')
      .update({ ativo: false })
      .eq('empresa_representada_id', body.empresa_representada_id)
      .eq('ativo', true);

    const { data: inserted, error: insErr } = await client
      .from('fiscal_certificados')
      .insert({
        empresa_representada_id: body.empresa_representada_id,
        storage_path: storagePath,
        senha_secret_ref: body.senha_secret_ref,
        thumbprint: body.thumbprint,
        cn_subject: body.cn_subject,
        valido_de: body.valido_de,
        valido_ate: body.valido_ate,
        ativo: true,
        uploaded_by: userData.user.id,
      })
      .select()
      .single();

    if (insErr) {
      // Rollback do upload em caso de falha no insert
      await client.storage.from('fiscal-certificados').remove([storagePath]);
      console.error('[fiscal-upload-certificado] insert falhou', insErr);
      return json({ error: 'db_insert_failed', details: insErr.message }, 500);
    }

    return json({ ok: true, certificado: inserted }, 200);
  } catch (err) {
    console.error('[fiscal-upload-certificado] erro inesperado', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
