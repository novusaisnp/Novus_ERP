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

export interface DanfeMockEnrichmentData {
  emitente: Record<string, unknown>;
  destinatario: Record<string, unknown>;
  itens: Array<{
    descricao: string | null;
    quantidade: number | null;
    unidade: string | null;
    preco_unitario: number | null;
    valor_total_item: number | null;
  }>;
  naturezaOperacao: string | null;
}

/**
 * Busca dados de empresa/cliente/itens para enriquecer o DANFE mock exibido
 * em modo simulação (sem validade fiscal). Usado por DetalheNFeDrawer.
 */
export async function getDanfeMockEnrichmentData(params: {
  empresaRepresentadaId?: string | null;
  vendaId?: string | null;
}): Promise<DanfeMockEnrichmentData> {
  const result: DanfeMockEnrichmentData = {
    emitente: {},
    destinatario: {},
    itens: [],
    naturezaOperacao: null,
  };

  if (params.empresaRepresentadaId) {
    const { data: emp } = await supabase
      .from('empresas_representadas')
      .select('razao_social, nome_fantasia, cnpj, inscricao_estadual, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
      .eq('id', params.empresaRepresentadaId)
      .maybeSingle();
    if (emp) result.emitente = emp;
  }

  if (params.vendaId) {
    const { data: venda } = await supabase
      .from('vendas')
      .select('cliente_id, natureza_operacao, observacoes')
      .eq('id', params.vendaId)
      .maybeSingle();
    result.naturezaOperacao = venda?.natureza_operacao ?? null;
    const clienteId = venda?.cliente_id;
    if (clienteId) {
      const { data: cli } = await supabase
        .from('clientes')
        .select('nome, razao_social, tipo_pessoa, cnpj, cpf, inscricao_estadual, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
        .eq('id', clienteId)
        .maybeSingle();
      if (cli) result.destinatario = cli;
    }
    const { data: rows } = await supabase
      .from('itens_venda')
      .select('descricao, quantidade, unidade, preco_unitario, valor_total_item, ordem')
      .eq('venda_id', params.vendaId)
      .order('ordem', { ascending: true });
    result.itens = rows ?? [];
  }

  return result;
}
