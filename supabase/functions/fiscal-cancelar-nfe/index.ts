// Edge Function: fiscal-cancelar-nfe.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { hasEveryPermission } from '../_shared/permissions.ts';
import { resolveFiscalProvider } from '../_shared/fiscal/providers/resolveFiscalProvider.ts';
import type { FiscalEnvironment, FiscalProviderName } from '../_shared/fiscal/providers/FiscalProvider.ts';

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

    if (!await hasEveryPermission(client, userData.user.id, ['fiscal.cancelarNfe'])) {
      return json({ error: 'forbidden' }, 403);
    }

    const body = (await req.json()) as CancelarRequest;
    if (!body?.documentoId) return json({ error: 'invalid_input', missing: ['documentoId'] }, 400);
    const just = (body.justificativa ?? '').trim();
    if (just.length < 15 || just.length > 255) {
      return json({ error: 'invalid_justificativa', message: 'Justificativa deve ter entre 15 e 255 caracteres.' }, 422);
    }

    const { data: doc, error: docErr } = await client
      .from('fiscal_documentos_eletronicos')
      .select('id, empresa_representada_id, tipo, status, provider_ref, provider, ambiente')
      .eq('id', body.documentoId)
      .maybeSingle();
    if (docErr || !doc) return json({ error: 'documento_not_found' }, 404);
    if (String(doc.status).toUpperCase() !== 'AUTORIZADA') {
      return json({ error: 'invalid_status', message: `Somente documento autorizado pode ser cancelado (atual: ${doc.status}).` }, 409);
    }

    const useMock = (Deno.env.get('FISCAL_MOCK') ?? 'true').toLowerCase() !== 'false';
    if (!useMock && !doc.provider_ref) {
      return json({ error: 'provider_ref_missing', message: 'Documento sem referência no provedor.' }, 409);
    }
    const providerResult = useMock
      ? { status: 'cancelada', raw: { mock: true } }
      : await (() => {
        const provider = resolveFiscalProvider(
          (doc.provider ?? 'focusnfe') as FiscalProviderName,
          (doc.ambiente === 'PRODUCAO' ? 'production' : 'homologation') as FiscalEnvironment,
        );
        const payload = { providerRef: doc.provider_ref!, justificativa: just };
        return doc.tipo === 'NFCE'
          ? provider.cancelNFCe(payload)
          : doc.tipo === 'MDFE'
            ? provider.cancelMDFe(payload)
            : provider.cancelNFe(payload);
      })();
    if (providerResult.status !== 'cancelada') {
      return json({ error: 'cancelamento_nao_confirmado', status: providerResult.status, details: providerResult.motivo }, 502);
    }
    const raw = providerResult.raw as Record<string, unknown>;
    const protocolo = useMock
      ? `MOCK-CANC-${Date.now()}`
      : String(raw.protocolo_cancelamento ?? raw.protocolo ?? '');

    const { error: upErr } = await client
      .from('fiscal_documentos_eletronicos')
      .update({ status: 'CANCELADA', motivo_rejeicao: null })
      .eq('id', body.documentoId);
    if (upErr) return json({ error: 'db_update_failed', details: upErr.message }, 500);
    if (doc.tipo === 'MDFE') {
      await client.from('fiscal_mdfe_operacoes').update({ status: 'CANCELADA' }).eq('documento_id', doc.id);
    }

    const { data: evento, error: evErr } = await client
      .from('fiscal_eventos')
      .insert({
        empresa_representada_id: doc.empresa_representada_id,
        documento_id: doc.id,
        tipo: 'cancelamento',
        justificativa: just,
        protocolo,
        status: 'cancelada',
        payload_provedor: providerResult.raw,
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
