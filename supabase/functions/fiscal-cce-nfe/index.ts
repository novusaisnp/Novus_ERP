// Edge Function: fiscal-cce-nfe (Fase 3 mock — sem API externa)
//
// Registra evento de Carta de Correção em fiscal_eventos. Documento
// permanece 'autorizada'. Sequência é auto-incremental por documento.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface CCeRequest {
  documentoId: string;
  correcao: string;
  sequencia?: number;
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

    const { data: isAdmin } = await client.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);

    const body = (await req.json()) as CCeRequest;
    if (!body?.documentoId) return json({ error: 'invalid_input', missing: ['documentoId'] }, 400);
    const correcao = (body.correcao ?? '').trim();
    if (correcao.length < 15 || correcao.length > 1000) {
      return json({ error: 'invalid_correcao', message: 'Correção deve ter entre 15 e 1000 caracteres.' }, 422);
    }

    const { data: doc, error: docErr } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, empresa_representada_id, status, provider')
      .eq('id', body.documentoId)
      .maybeSingle();
    if (docErr || !doc) return json({ error: 'documento_not_found' }, 404);
    if (String(doc.status).toUpperCase() !== 'AUTORIZADA') {
      return json({ error: 'invalid_status', message: `Somente NF-e autorizada aceita CC-e (atual: ${doc.status}).` }, 409);
    }

    // Próxima sequência
    const { data: ultimos } = await client
      .from('fiscal_eventos')
      .select('sequencia')
      .eq('documento_id', doc.id)
      .eq('tipo', 'cce')
      .order('sequencia', { ascending: false })
      .limit(1);
    const proxSeq = body.sequencia ?? ((ultimos?.[0]?.sequencia ?? 0) + 1);
    if (proxSeq < 1 || proxSeq > 20) {
      return json({ error: 'invalid_sequencia', message: 'Sequência de CC-e fora do intervalo permitido (1..20).' }, 422);
    }

    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    const protocolo = useMock ? `MOCK-CCE-${proxSeq}-${Date.now()}` : `PROV-${crypto.randomUUID()}`;

    const { data: evento, error: evErr } = await client
      .from('fiscal_eventos')
      .insert({
        empresa_representada_id: doc.empresa_representada_id,
        documento_id: doc.id,
        tipo: 'cce',
        sequencia: proxSeq,
        justificativa: correcao,
        protocolo,
        status: 'autorizada',
        payload_provedor: { mock: useMock },
        created_by: userData.user.id,
      })
      .select('id')
      .single();
    if (evErr) return json({ error: 'evento_insert_failed', details: evErr.message }, 500);

    console.log(JSON.stringify({
      event: 'fiscal.cce',
      documento_id: doc.id,
      empresa_id: doc.empresa_representada_id,
      provider: doc.provider,
      sequencia: proxSeq,
      mock: useMock,
      latency_ms: Date.now() - started,
      ts: new Date().toISOString(),
    }));

    return json({ ok: true, evento_id: evento.id, sequencia: proxSeq, protocolo, mock: useMock }, 200);
  } catch (err) {
    console.error('[fiscal-cce-nfe] erro inesperado', err);
    return json({ error: 'internal_error', message: (err as Error).message }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
