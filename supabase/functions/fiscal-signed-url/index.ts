// Edge Function: fiscal-signed-url
// Emite URL assinada de 5 min para XML/DANFE em buckets privados fiscais.
// Paths mockados (mock://...) retornam 404 explícito.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';

const ALLOWED_BUCKETS = new Set(['fiscal-xml', 'fiscal-danfe', 'fiscal-sped']);
const EXPIRES_IN = 300;

interface SignedUrlRequest {
  bucket: string;
  path: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) return json({ error: 'unauthorized' }, 401);

    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await client.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'unauthorized' }, 401);

    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.read'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const { bucket, path } = (await req.json()) as SignedUrlRequest;
    if (!bucket || !path) return json({ error: 'invalid_input', missing: ['bucket', 'path'] }, 400);
    if (!ALLOWED_BUCKETS.has(bucket)) return json({ error: 'bucket_not_allowed', bucket }, 400);
    if (path.startsWith('mock://') || path.startsWith('http')) {
      return json({ error: 'mock_path', message: 'Arquivo simulado — indisponível para download.' }, 404);
    }

    const { data, error } = await client.storage.from(bucket).createSignedUrl(path, EXPIRES_IN);
    if (error || !data) return json({ error: 'signed_url_failed', details: error?.message }, 500);

    return json({ url: data.signedUrl, expires_in: EXPIRES_IN }, 200);
  } catch (err) {
    console.error('[fiscal-signed-url] erro', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
