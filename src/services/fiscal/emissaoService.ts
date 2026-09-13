import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { empresasRepresentadasService } from "@/services/empresasRepresentadasService";

console.log('[Fiscal] Inicializando emissaoService');

export interface EmitirNFeInput {
  vendaId: string;
  tipo?: 'NFE' | 'NFCE';
  /** Emissão manual em contingência (SEFAZ/provedor indisponível). Só vale para NFCE. */
  contingencia?: boolean;
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
  forma_emissao?: 'normal' | 'contingencia';
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

export interface FiscalDocumento {
  id: string;
  empresa_representada_id: string;
  tipo: string;
  venda_id: string | null;
  numero: number | null;
  serie: number | null;
  status: string;
  chave_acesso: string | null;
  protocolo_autorizacao: string | null;
  motivo_rejeicao: string | null;
  codigo_status_sefaz: string | null;
  xml_url: string | null;
  danfe_url: string | null;
  pdf_danfe_url: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  provider: string | null;
  ambiente: string | null;
  tentativas: number;
  forma_emissao: 'normal' | 'contingencia';
  codigo_unico_contingencia: string | null;
}

export interface FiscalEvento {
  id: string;
  documento_id: string;
  tipo: string;
  sequencia: number | null;
  justificativa: string | null;
  protocolo: string | null;
  status: string | null;
  motivo_rejeicao: string | null;
  created_at: string;
}

export interface FiscalFunctionError extends Error {
  /** Código estruturado devolvido pelo edge function (ex.: 'sefaz_indisponivel', 'duplicate_emission'). */
  code?: string;
  documentoId?: string;
}

async function invokeOrThrow<T>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) {
    console.error(`[Fiscal] ${fn} erro:`, error);
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload) {
        const err: FiscalFunctionError = new Error(payload.message || payload.error || error.message);
        err.code = payload.error;
        err.documentoId = payload.documento_id;
        throw err;
      }
    }
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

export const consultarNFe = (documentoId: string) =>
  invokeOrThrow<{ ok: boolean; status: string; mock?: boolean }>('fiscal-consultar-nfe', { documentoId });

export async function getFiscalDocumento(documentoId: string): Promise<FiscalDocumento | null> {
  let result = await supabase.from('fiscal_documentos_eletronicos').select('*').eq('id', documentoId).maybeSingle();
  if (result.error) throw result.error;
  if (['processando', 'em_processamento'].includes(result.data?.status?.toLowerCase() ?? '')) {
    await consultarNFe(documentoId);
    result = await supabase.from('fiscal_documentos_eletronicos').select('*').eq('id', documentoId).maybeSingle();
    if (result.error) throw result.error;
  }
  return result.data as FiscalDocumento | null;
}

export async function getFiscalEventos(documentoId: string): Promise<FiscalEvento[]> {
  const { data, error } = await supabase
    .from('fiscal_eventos')
    .select('*')
    .eq('documento_id', documentoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as FiscalEvento[];
}

export const getFiscalSignedUrl = (bucket: string, path: string) =>
  invokeOrThrow<{ url: string; expires_in: number }>('fiscal-signed-url', { bucket, path });

export interface DanfeMockEnrichmentData {
  emitente: Record<string, unknown>;
  destinatario: Record<string, unknown>;
  itens: Array<{
    codigo?: string | null;
    descricao: string | null;
    quantidade: number | null;
    unidade: string | null;
    preco_unitario: number | null;
    valor_total_item: number | null;
    ncm?: string | null;
    cfop?: string | null;
  }>;
  pagamentos: Array<{ nome: string | null; valor: number | null }>;
  mdfe: Record<string, unknown> | null;
  naturezaOperacao: string | null;
}

/**
 * Busca dados de empresa/cliente/itens para enriquecer o DANFE mock exibido
 * em modo simulação (sem validade fiscal). Usado por DetalheNFeDrawer.
 */
export async function getDanfeMockEnrichmentData(params: {
  empresaRepresentadaId?: string | null;
  vendaId?: string | null;
  documentoId?: string | null;
}): Promise<DanfeMockEnrichmentData> {
  const result: DanfeMockEnrichmentData = {
    emitente: {},
    destinatario: {},
    itens: [],
    pagamentos: [],
    mdfe: null,
    naturezaOperacao: null,
  };

  if (params.empresaRepresentadaId) {
    const [{ data: emp }, { data: fiscal }] = await Promise.all([
      supabase.from('empresas_representadas')
        .select('nome, cnpj, telefone, email, endereco, cidade, estado, cep, configuracoes')
        .eq('id', params.empresaRepresentadaId).maybeSingle(),
      supabase.from('fiscal_configuracoes').select('inscricao_estadual')
        .eq('empresa_representada_id', params.empresaRepresentadaId).maybeSingle(),
    ]);
    if (emp) {
      const config = emp.configuracoes && typeof emp.configuracoes === 'object' && !Array.isArray(emp.configuracoes)
        ? emp.configuracoes as Record<string, unknown>
        : {};
      const logoPath = typeof config.logo_path === 'string' ? config.logo_path : '';
      const logoUrl = logoPath
        ? await empresasRepresentadasService.getSignedUrl('empresa-logos', logoPath, 3600)
        : null;
      result.emitente = {
        ...emp,
        razao_social: emp.nome,
        nome_fantasia: emp.nome,
        logradouro: emp.endereco,
        inscricao_estadual: fiscal?.inscricao_estadual,
        logo_url: logoUrl,
      };
    }
  }

  if (params.documentoId) {
    const { data: snapshot } = await supabase.from('fiscal_documentos_eletronicos_itens')
      .select('ordem, produto_id, descricao, quantidade, unidade, valor_unitario, valor_total, ncm, cfop')
      .eq('documento_id', params.documentoId).order('ordem');
    if (snapshot?.length) {
      result.itens = snapshot.map(item => ({
        codigo: item.produto_id?.slice(0, 8) ?? null,
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        preco_unitario: item.valor_unitario,
        valor_total_item: item.valor_total,
        ncm: item.ncm,
        cfop: item.cfop,
      }));
    }

    const { data: mdfeOperation } = await supabase.from('fiscal_mdfe_operacoes' as never)
      .select('*').eq('documento_id', params.documentoId).maybeSingle();
    if (mdfeOperation) {
      const operation = mdfeOperation as unknown as Record<string, unknown>;
      const { data: linkedDocuments } = await supabase.from('fiscal_mdfe_documentos' as never)
        .select('tipo, chave_acesso, nome_municipio_descarregamento')
        .eq('operacao_id', String(operation.id));
      result.mdfe = { ...operation, documentos: linkedDocuments ?? [] };
    }
  }

  if (params.vendaId) {
    let vendaQ = supabase.from('vendas').select('cliente_id, observacoes').eq('id', params.vendaId);
    if (params.empresaRepresentadaId) vendaQ = vendaQ.eq('empresa_representada_id', params.empresaRepresentadaId);
    const { data: venda } = await vendaQ.maybeSingle();
    const clienteId = venda?.cliente_id;
    if (clienteId) {
      let cliQ = supabase
        .from('entidades')
        .select('nome, razao_social, tipo_pessoa, cnpj, cpf, inscricao_estadual, email, telefone, logradouro, numero, complemento, bairro, cidade, estado, cep')
        .eq('id', clienteId);
      if (params.empresaRepresentadaId) cliQ = cliQ.eq('empresa_representada_id', params.empresaRepresentadaId);
      const { data: cli } = await cliQ.maybeSingle();
      if (cli) result.destinatario = cli;
    }
    if (!result.itens.length) {
      let itensQ = supabase.from('itens_venda')
        .select('descricao, quantidade, unidade, preco_unitario, valor_total_item, ordem')
        .eq('venda_id', params.vendaId);
      if (params.empresaRepresentadaId) itensQ = itensQ.eq('empresa_representada_id', params.empresaRepresentadaId);
      const { data: rows } = await itensQ.order('ordem', { ascending: true });
      result.itens = rows ?? [];
    }
    const { data: payments } = await supabase.from('venda_pagamento')
      .select('valor_liquido, modalidade:modalidades_pagamento(nome)')
      .eq('venda_id', params.vendaId).is('deleted_at', null);
    result.pagamentos = (payments ?? []).map(payment => ({
      nome: payment.modalidade?.nome ?? null,
      valor: payment.valor_liquido,
    }));
  }

  return result;
}
