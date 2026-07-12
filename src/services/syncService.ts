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

export const syncService = {
  // Configurar webhook para sistema externo (schema real: nome/url_destino/secret_token/eventos/ativo)
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

  // Enviar dados para sistema externo
  async sendToExternalSystem(systemUrl: string, data: any, secret: string) {
    const timestamp = new Date().toISOString();
    const payload = {
      ...data,
      timestamp,
      source_system: 'NOVUS_ERP'
    };

    const signature = await this.generateSignature(JSON.stringify(payload), secret);

    const response = await fetch(systemUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Source-System': 'NOVUS_ERP'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro na sincronização: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  },

  async generateSignature(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  async validateClienteSync(clienteData: any): Promise<boolean> {
    if (!clienteData.nome || !clienteData.tipo) return false;
    if (clienteData.tipo === 'J' && !clienteData.cnpj) return false;
    if (clienteData.tipo === 'F' && !clienteData.cpf) return false;
    return true;
  },

  async syncCliente(clienteId: string, targetSystems: string[]) {
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
    for (const system of targetSystems) {
      try {
        const result = await this.sendToExternalSystem(
          system,
          { event: 'sync', table: 'clientes', data: cliente },
          'seu-webhook-secret'
        );
        results.push({ system, status: 'success', result });
      } catch (error: any) {
        results.push({ system, status: 'error', error: error.message });
      }
    }
    return results;
  }
};
