
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
}

export const syncService = {
  // Configurar webhook para sistema externo
  async setupWebhook(targetSystem: string, config: WebhookConfig) {
    const { data, error } = await supabase
      .from('webhook_configs')
      .insert({
        target_system: targetSystem,
        webhook_url: config.url,
        webhook_secret: config.secret,
        events: config.events,
        active: config.active
      });

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

    // Gerar assinatura para segurança
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

  // Gerar assinatura HMAC para segurança
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

  // Validar sincronização de cliente
  async validateClienteSync(clienteData: any): Promise<boolean> {
    // Validações específicas para clientes
    if (!clienteData.nome || !clienteData.tipo) {
      return false;
    }

    if (clienteData.tipo === 'J' && !clienteData.cnpj) {
      return false;
    }

    if (clienteData.tipo === 'F' && !clienteData.cpf) {
      return false;
    }

    return true;
  },

  // Sincronizar cliente específico
  async syncCliente(clienteId: string, targetSystems: string[]) {
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', clienteId)
      .single();

    if (error) throw error;

    if (!this.validateClienteSync(cliente)) {
      throw new Error('Dados do cliente inválidos para sincronização');
    }

    const results = [];
    for (const system of targetSystems) {
      try {
        const result = await this.sendToExternalSystem(
          system, 
          {
            event: 'sync',
            table: 'clientes',
            data: cliente
          },
          'seu-webhook-secret' // Deve vir de configuração
        );
        results.push({ system, status: 'success', result });
      } catch (error) {
        results.push({ system, status: 'error', error: error.message });
      }
    }

    return results;
  }
};
