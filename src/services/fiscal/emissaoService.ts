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

export interface CancelarNFeResult {
  ok: boolean;
  status: string;
  evento_id: string;
  protocolo: string;
  mock?: boolean;
}

export interface CartaCorrecaoInput {
  documentoId: string;
  correcao: string;
  sequencia?: number;
}

export interface CartaCorrecaoResult {
  ok: boolean;
  evento_id: string;
  sequencia: number;
  protocolo: string;
  mock?: boolean;
}

async function invokeOrThrow<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) {
    console.error(`[Fiscal] ${fn} erro:`, error);
    throw error;
  }
  if (!data) throw new Error(`Resposta vazia de ${fn}`);
  return data;
}

export const emitirNFe = (input: EmitirNFeInput) =>
  invokeOrThrow<EmitirNFeResult>('fiscal-emitir-nfe', input);

export const cancelarNFe = (input: CancelarNFeInput) =>
  invokeOrThrow<CancelarNFeResult>('fiscal-cancelar-nfe', input);

export const enviarCartaCorrecao = (input: CartaCorrecaoInput) =>
  invokeOrThrow<CartaCorrecaoResult>('fiscal-cce-nfe', input);

export const getFiscalSignedUrl = (bucket: string, path: string) =>
  invokeOrThrow<{ url: string; expires_in: number }>('fiscal-signed-url', { bucket, path });
