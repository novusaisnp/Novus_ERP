import { supabase } from "@/integrations/supabase/client";

console.log('[Fiscal] Inicializando emissaoService');

export interface EmitirNFeInput {
  vendaId: string;
  provider?: 'focusnfe' | 'plugnotas' | 'enotas' | 'nfeio';
  environment?: 'homologation' | 'production';
}

export interface EmitirNFeResult {
  ok: boolean;
  documento_id: string;
  status: string;
  provider_ref?: string;
  chave_acesso?: string;
  xml_url?: string;
  danfe_url?: string;
  mock?: boolean;
}

export interface CancelarNFeInput {
  documentoId: string;
  justificativa: string;
}

export interface CartaCorrecaoInput {
  documentoId: string;
  correcao: string;
  sequencia?: number;
}

/**
 * Dispara a emissão da NF-e via Edge Function.
 * O provedor externo pode estar mockado enquanto o token não está configurado.
 */
export async function emitirNFe(input: EmitirNFeInput): Promise<EmitirNFeResult> {
  const { data, error } = await supabase.functions.invoke<EmitirNFeResult>('fiscal-emitir-nfe', {
    body: input,
  });
  if (error) {
    console.error('[Fiscal] emitirNFe erro:', error);
    throw error;
  }
  if (!data) throw new Error('Resposta vazia da Edge Function fiscal-emitir-nfe');
  return data;
}

/**
 * Cancelamento — Edge Function será implementada na Fase 3. Placeholder mantém a
 * assinatura estável para consumo pela UI.
 */
export async function cancelarNFe(_input: CancelarNFeInput): Promise<{ ok: boolean }> {
  throw new Error('Cancelamento de NF-e ainda não implementado (previsto para Fase 3).');
}

export async function enviarCartaCorrecao(_input: CartaCorrecaoInput): Promise<{ ok: boolean }> {
  throw new Error('Carta de Correção ainda não implementada (previsto para Fase 3).');
}
