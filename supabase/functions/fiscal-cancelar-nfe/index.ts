// Edge Function: fiscal-cancelar-nfe (Fase 3 mock — sem API externa)
//
// Valida documento, aplica UPDATE de status e registra evento em fiscal_eventos.
// Quando FISCAL_MOCK=false (futuro), delegará a provider.cancelNFe().

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface CancelarRequest {
  documentoId: string;
  justificativa: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const started = Date.now();

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

    const { data: isAdmin, error: roleErr } = await client.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) return json({ error: 'forbidden' }, 403);

    const body = (await req.json()) as CancelarRequest;
    if (!body?.documentoId) return json({ error: 'invalid_input', missing: ['documentoId'] }, 400);
    const just = (body.justificativa ?? '').trim();
    if (just.length < 15 || just.length > 255) {
      return json({ error: 'invalid_justificativa', message: 'Justificativa deve ter entre 15 e 255 caracteres.' }, 422);
    }

    const { data: doc, error: docErr } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, empresa_representada_id, status, provider_ref, provider')
      .eq('id', body.documentoId)
      .maybeSingle();
    if (docErr || !doc) return json({ error: 'documento_not_found' }, 404);
    if (String(doc.status).toUpperCase() !== 'AUTORIZADA') {
      return json({ error: 'invalid_status', message: `Somente NF-e autorizada pode ser cancelada (atual: ${doc.status}).` }, 409);
    }

    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    const protocolo = useMock ? `MOCK-CANC-${Date.now()}` : `PROV-${crypto.randomUUID()}`;

    const { error: upErr } = await client
      .from('fiscal_documentos_eletronicos')
      .update({ status: 'CANCELADA', motivo_rejeicao: null })
      .eq('id', body.documentoId);
    if (upErr) return json({ error: 'db_update_failed', details: upErr.message }, 500);

    const { data: evento, error: evErr } = await client
      .from('fiscal_eventos')
      .insert({
        empresa_representada_id: doc.empresa_representada_id,
        documento_id: doc.id,
        tipo: 'cancelamento',
        justificativa: just,
        protocolo,
        status: 'cancelada',
        payload_provedor: { mock: useMock },
        created_by: userData.user.id,
      })
      .select('id')
      .single();
    if (evErr) return json({ error: 'evento_insert_failed', details: evErr.message }, 500);

    console.log(JSON.stringify({
      event: 'fiscal.cancel',
      documento_id: doc.id,
      empresa_id: doc.empresa_representada_id,
      provider: doc.provider,
      mock: useMock,
      latency_ms: Date.now() - started,
      ts: new Date().toISOString(),
    }));

    return json({ ok: true, status: 'cancelada', evento_id: evento.id, protocolo, mock: useMock }, 200);
  } catch (err) {
    console.error('[fiscal-cancelar-nfe] erro inesperado', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
