import { supabase as _supabase } from '@/integrations/supabase/client';
import {
  WebhookConfig,
  WebhookConfigInput,
  WebhookConfigInputSchema,
  generateSecretToken,
  hmacSha256Hex,
} from '@/types/webhookConfig';

const supabase: any = _supabase;

const TABLE = 'webhook_configs';
const UNIQUE_NOME_CONSTRAINT = 'webhook_configs_empresa_nome_key';

function mapWebhookError(error: any): Error {
  if (error?.code === '23505') {
    const msg = String(error?.message ?? '');
    if (
      error?.constraint === UNIQUE_NOME_CONSTRAINT ||
      msg.includes(UNIQUE_NOME_CONSTRAINT)
    ) {
      return new Error('Já existe um webhook com este nome para esta empresa.');
    }
  }
  return error instanceof Error ? error : new Error(String(error?.message ?? error));
}


export const webhookConfigService = {
  async list(empresaId: string): Promise<WebhookConfig[]> {
    if (!empresaId) throw new Error('empresa_representada_id obrigatório');
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('nome', { ascending: true });
    if (error) throw error;
    return (data ?? []) as WebhookConfig[];
  },

  async get(id: string, empresaId: string): Promise<WebhookConfig | null> {
    if (!empresaId) throw new Error('empresa_representada_id obrigatório');
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as WebhookConfig | null;
  },

  async assertNomeUnico(nome: string, empresaId: string, excludeId?: string): Promise<void> {
    const query = supabase
      .from(TABLE)
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .eq('nome', nome.trim());
    const { data, error } = await query;
    if (error) throw error;
    const conflicts = (data ?? []).filter((r: any) => r.id !== excludeId);
    if (conflicts.length > 0) {
      throw new Error('Já existe um webhook com este nome nesta empresa');
    }
  },

  async create(input: WebhookConfigInput): Promise<WebhookConfig> {
    const parsed = WebhookConfigInputSchema.parse(input);
    await this.assertNomeUnico(parsed.nome, parsed.empresa_representada_id);
    const payload = {
      nome: parsed.nome,
      descricao: parsed.descricao ?? null,
      url_destino: parsed.url_destino,
      metodo: parsed.metodo,
      secret_token: parsed.secret_token ?? generateSecretToken(),
      eventos: parsed.eventos,
      max_tentativas: parsed.max_tentativas,
      timeout_segundos: parsed.timeout_segundos,
      ativo: parsed.ativo,
      empresa_representada_id: parsed.empresa_representada_id,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as WebhookConfig;
  },

  async update(
    id: string,
    patch: Partial<WebhookConfigInput>,
    empresaId: string,
  ): Promise<WebhookConfig> {
    if (!empresaId) throw new Error('empresa_representada_id obrigatório');
    if (patch.nome) {
      await this.assertNomeUnico(patch.nome, empresaId, id);
    }
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();
    if (error) throw error;
    return data as WebhookConfig;
  },

  /** Inativação lógica — NUNCA delete físico. */
  async inativar(id: string, empresaId: string): Promise<WebhookConfig> {
    return this.update(id, { ativo: false } as any, empresaId);
  },

  async ativar(id: string, empresaId: string): Promise<WebhookConfig> {
    return this.update(id, { ativo: true } as any, empresaId);
  },

  async rotateSecret(id: string, empresaId: string): Promise<{ secret_token: string; row: WebhookConfig }> {
    const newSecret = generateSecretToken();
    const row = await this.update(id, { secret_token: newSecret } as any, empresaId);
    return { secret_token: newSecret, row };
  },

  async testSignatureLocal(secret: string, samplePayload: unknown): Promise<{
    payload: string;
    signature: string;
    headers: Record<string, string>;
  }> {
    const payload = JSON.stringify(samplePayload);
    const signature = await hmacSha256Hex(payload, secret);
    const headers = {
      'X-Webhook-Timestamp': new Date().toISOString(),
      'X-Webhook-Delivery': crypto.randomUUID(),
      'X-Webhook-Attempt': '1',
      'X-Webhook-Signature': `sha256=${signature}`,
    };
    return { payload, signature, headers };
  },
};
