import { supabase as _supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
const supabase: any = _supabase;

// Schema alinhado com public.webhook_configs
export const WebhookConfigSchema = z.object({
  nome: z.string().trim().min(1, 'nome é obrigatório').max(100),
  url_destino: z.string().url('url_destino deve ser URL válida').max(500),
  secret_token: z.string().min(1).max(255).optional().nullable(),
  eventos: z.array(z.string()).default([]),
  ativo: z.boolean().default(true),
  empresa_representada_id: z.string().uuid('empresa_representada_id deve ser UUID'),
});

export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

/** Versão de assinatura emitida por padrão. Controlado por rollout, não hardcoded. */
type SignatureVersion = 'v1' | 'v2';

async function hmacSha256HexBytes(bytes: Uint8Array, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildCanonicalV2(params: {
  method: string;
  path: string;
  timestampEpochSec: string;
  deliveryId: string;
  bodyHashHex: string;
}): string {
  return [
    params.method,
    params.path,
    params.timestampEpochSec,
    params.deliveryId,
    params.bodyHashHex,
  ].join('\n');
}

/**
 * Busca o secret_token do webhook_configs (nome + empresa) — SEM segredos hardcoded.
 * Retorna null se a config não existir ou estiver inativa.
 */
async function resolveSecret(nome: string, empresaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('webhook_configs')
    .select('secret_token, ativo')
    .eq('nome', nome)
    .eq('empresa_representada_id', empresaId)
    .maybeSingle();
  if (error || !data || !data.ativo) return null;
  return data.secret_token ?? null;
}

export const syncService = {
  async setupWebhook(config: WebhookConfig) {
    const parsed = WebhookConfigSchema.parse(config);
    const { data, error } = await supabase
      .from('webhook_configs')
      .insert({
        nome: parsed.nome,
        url_destino: parsed.url_destino,
        secret_token: parsed.secret_token ?? null,
        eventos: parsed.eventos,
        ativo: parsed.ativo,
        empresa_representada_id: parsed.empresa_representada_id,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Envia dados assinados para um sistema externo.
   * O secret é obtido de webhook_configs (nunca hardcoded).
   */
  async sendToExternalSystem(opts: {
    systemUrl: string;
    sourceSystem: string;
    empresaId: string;
    data: unknown;
    signatureVersion?: SignatureVersion;
    attempt?: number;
  }) {
    const {
      systemUrl,
      sourceSystem,
      empresaId,
      data,
      signatureVersion = 'v2',
      attempt = 1,
    } = opts;

    const secret = await resolveSecret(sourceSystem, empresaId);
    if (!secret) {
      throw new Error(
        `secret_token não configurado para webhook "${sourceSystem}" (empresa ${empresaId})`,
      );
    }

    const timestampEpochSec = String(Math.trunc(Date.now() / 1000));
    const deliveryId = crypto.randomUUID();
    const url = new URL(systemUrl);

    const bodyStr = JSON.stringify({
      ...(data as Record<string, unknown>),
      timestamp: new Date().toISOString(),
      source_system: sourceSystem,
    });
    const bodyBytes = new TextEncoder().encode(bodyStr);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Source-System': sourceSystem,
      'x-empresa-id': empresaId,
      'X-Webhook-Timestamp': timestampEpochSec,
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Attempt': String(attempt),
      'X-Webhook-Signature-Version': signatureVersion,
    };

    if (signatureVersion === 'v2') {
      const bodyHashHex = await sha256HexBytes(bodyBytes);
      const canonical = buildCanonicalV2({
        method: 'POST',
        path: url.pathname,
        timestampEpochSec,
        deliveryId,
        bodyHashHex,
      });
      const sig = await hmacSha256HexBytes(new TextEncoder().encode(canonical), secret);
      headers['X-Webhook-Signature-V2'] = `sha256=${sig}`;
    } else {
      const sig = await hmacSha256HexBytes(bodyBytes, secret);
      headers['X-Webhook-Signature'] = `sha256=${sig}`;
    }

    const response = await fetch(systemUrl, { method: 'POST', headers, body: bodyStr });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Erro na sincronização: ${response.status} ${response.statusText} — ${text}`,
      );
    }
    return await response.json();
  },

  async validateClienteSync(clienteData: any): Promise<boolean> {
    if (!clienteData.nome || !clienteData.tipo) return false;
    if (clienteData.tipo === 'J' && !clienteData.cnpj) return false;
    if (clienteData.tipo === 'F' && !clienteData.cpf) return false;
    return true;
  },

  async syncCliente(
    clienteId: string,
    targets: Array<{ systemUrl: string; sourceSystem: string; empresaId: string }>,
  ) {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();
    if (error) throw error;
    if (!(await this.validateClienteSync(cliente))) {
      throw new Error('Dados do cliente inválidos para sincronização');
    }

    const results: Array<{ system: string; status: string; result?: any; error?: string }> = [];
    for (const t of targets) {
      try {
        const result = await this.sendToExternalSystem({
          systemUrl: t.systemUrl,
          sourceSystem: t.sourceSystem,
          empresaId: t.empresaId,
          data: { event: 'sync', table: 'clientes', data: cliente },
        });
        results.push({ system: t.systemUrl, status: 'success', result });
      } catch (err: any) {
        results.push({ system: t.systemUrl, status: 'error', error: err.message });
      }
    }
    return results;
  },
};
