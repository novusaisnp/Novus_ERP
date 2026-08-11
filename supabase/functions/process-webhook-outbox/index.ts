import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.110.2';
import { hmacSha256Hex, retryDelaySeconds } from '../_shared/outbound-webhook.ts';

interface Delivery {
  id: string;
  empresa_representada_id: string;
  evento: string;
  payload: Record<string, unknown>;
  tentativa: number;
  url_destino: string;
  metodo: string;
  headers: Record<string, string> | null;
  secret_token: string | null;
  timeout_segundos: number;
  max_tentativas: number;
}

async function updateDelivery(
  admin: SupabaseClient,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { error } = await admin.from('webhook_outbox').update(values).eq('id', id);
  if (error) throw new Error(`outbox_update_failed: ${error.message}`);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return Response.json({ error: 'missing_env' }, { status: 500 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('webhook_outbox_claim', { p_limite: 20 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const delivery of (data ?? []) as Delivery[]) {
    const body = JSON.stringify(delivery.payload);
    try {
      if (!delivery.secret_token) throw new Error('secret_token ausente');
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await hmacSha256Hex(body, delivery.secret_token);
      const response = await fetch(delivery.url_destino, {
        method: delivery.metodo,
        headers: {
          ...(delivery.headers ?? {}),
          'content-type': 'application/json',
          'x-source-system': 'novusai-erp',
          'x-empresa-id': delivery.empresa_representada_id,
          'x-webhook-event': delivery.evento,
          'x-webhook-delivery': delivery.id,
          'x-webhook-attempt': String(delivery.tentativa),
          'x-webhook-timestamp': timestamp,
          'x-webhook-signature': `sha256=${signature}`,
          'x-erp-signature': `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(delivery.timeout_segundos * 1000),
      });
      const responseBody = (await response.text()).slice(0, 2000);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${responseBody}`);

      await updateDelivery(admin, delivery.id, {
        status: 'ENTREGUE', entregue_em: new Date().toISOString(),
        processando_desde: null, http_status: response.status,
        resposta: responseBody, ultimo_erro: null,
      });
      results.push({ id: delivery.id, status: 'ENTREGUE' });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      const esgotado = delivery.tentativa >= delivery.max_tentativas;
      const nextAttempt = new Date(Date.now() + retryDelaySeconds(delivery.tentativa) * 1000).toISOString();
      await updateDelivery(admin, delivery.id, {
        status: esgotado ? 'ERRO' : 'PENDENTE', processando_desde: null,
        proxima_tentativa_em: nextAttempt, ultimo_erro: message.slice(0, 2000),
      });
      results.push({ id: delivery.id, status: esgotado ? 'ERRO' : 'PENDENTE' });
    }
  }

  return Response.json({ processed: results.length, results });
});
