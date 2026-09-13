// Interface comum a todos os provedores fiscais (Focus NFe, PlugNotas, eNotas, NFe.io).
// Toda comunicação com SEFAZ passa por um provedor externo — esta camada isola o resto do
// sistema das especificidades de cada API.

export type FiscalEnvironment = 'homologation' | 'production';

export type FiscalProviderName = 'focusnfe' | 'plugnotas' | 'enotas' | 'nfeio';

export type NFeStatus =
  | 'processando'
  | 'autorizada'
  | 'rejeitada'
  | 'cancelada'
  | 'encerrada'
  | 'denegada'
  | 'inutilizada'
  | 'erro';

export interface NFeItemPayload {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  icmsSituacaoTributaria: string;
  origem: string;
  aliquotaIcms: number;
  pisSituacaoTributaria: string;
  aliquotaPis: number;
  cofinsSituacaoTributaria: string;
  aliquotaCofins: number;
  ibsCbsSituacaoTributaria: string;
  ibsCbsClassificacaoTributaria: string;
  aliquotaIbsUf: number;
  aliquotaIbsMunicipio: number;
  aliquotaCbs: number;
}

export interface NFeDestinatarioPayload {
  cnpjCpf: string;
  nome: string;
  ie?: string;
  email?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    codigoMunicipio?: string;
    pais?: string;
    codigoPais?: string;
  };
}

export interface NFeEmitPayload {
  /** Chave idempotente única — evita emissão duplicada da mesma venda. */
  idempotencyKey: string;
  naturezaOperacao: string;
  serie: number;
  numero?: number;
  dataEmissao: string; // ISO
  finalidade: 'normal' | 'complementar' | 'ajuste' | 'devolucao';
  presencaComprador?: number;
  emitente: {
    cnpj: string;
    inscricaoEstadual: string;
    regimeTributario: 1 | 3 | 4;
  };
  localDestino: 1 | 2 | 3;
  consumidorFinal: 0 | 1;
  indicadorIeDestinatario: 1 | 2 | 9;
  modalidadeFrete: 0 | 1 | 2 | 3 | 4 | 9;
  destinatario: NFeDestinatarioPayload;
  itens: NFeItemPayload[];
  valorTotal: number;
  observacoes?: string;
}

export interface NFeEmitResult {
  status: NFeStatus;
  providerRef: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
  codigoStatusSefaz?: string;
  motivoRejeicao?: string;
  xmlUrl?: string;
  danfeUrl?: string;
  raw: unknown;
}

export interface NFeCancelPayload {
  providerRef: string;
  justificativa: string; // mínimo 15 caracteres exigido pela SEFAZ
}

export interface NFeCCePayload {
  providerRef: string;
  correcao: string; // mínimo 15 caracteres
  sequencia: number;
}

export interface NFeStatusResult {
  status: NFeStatus;
  codigoStatusSefaz?: string;
  motivo?: string;
  chaveAcesso?: string;
  protocoloAutorizacao?: string;
  xmlUrl?: string;
  danfeUrl?: string;
  raw: unknown;
}

export interface NFCePagamentoPayload {
  formaPagamento: string;
  valorPagamento: number;
  bandeiraOperadora?: string;
  numeroAutorizacao?: string;
}

export interface NFCeEmitPayload extends NFeEmitPayload {
  pagamentos: NFCePagamentoPayload[];
  contingenciaOffline?: { codigoUnico: string };
}

export interface MDFeEmitPayload {
  idempotencyKey: string;
  body: Record<string, unknown>;
}

export interface FiscalAssetDownload {
  content: Uint8Array;
  contentType: string;
}

export interface FiscalProvider {
  readonly name: FiscalProviderName;
  readonly environment: FiscalEnvironment;

  emitNFe(payload: NFeEmitPayload): Promise<NFeEmitResult>;
  emitNFCe(payload: NFCeEmitPayload): Promise<NFeEmitResult>;
  consultNFCeStatus(providerRef: string): Promise<NFeStatusResult>;
  cancelNFCe(payload: NFeCancelPayload): Promise<NFeStatusResult>;
  emitMDFe(payload: MDFeEmitPayload): Promise<NFeEmitResult>;
  consultMDFeStatus(providerRef: string): Promise<NFeStatusResult>;
  cancelMDFe(payload: NFeCancelPayload): Promise<NFeStatusResult>;
  closeMDFe(providerRef: string, data: string, uf: string, municipio: string): Promise<NFeStatusResult>;
  addMDFeDriver(providerRef: string, nome: string, cpf: string): Promise<NFeStatusResult>;
  cancelNFe(payload: NFeCancelPayload): Promise<NFeStatusResult>;
  consultNFeStatus(providerRef: string): Promise<NFeStatusResult>;
  sendCCe(payload: NFeCCePayload): Promise<NFeStatusResult>;

  /** Baixa binário do XML autorizado pelo provedor. Aceita URL absoluta ou providerRef. */
  downloadXml?(refOrUrl: string): Promise<FiscalAssetDownload>;
  /** Baixa binário do DANFE (PDF) pelo provedor. Aceita URL absoluta ou providerRef. */
  downloadDanfe?(refOrUrl: string): Promise<FiscalAssetDownload>;
}

export class FiscalProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly providerBody?: unknown,
  ) {
    super(message);
    this.name = 'FiscalProviderError';
  }
}

/**
 * Distingue "SEFAZ/provedor fora do ar" (retomável — vale oferecer contingência) de
 * "rejeição de negócio" (dado inválido, autenticação, regra fiscal — não é caso de
 * contingência). Erro de rede (fetch falhou antes de ter resposta) ou 5xx/408 do
 * provedor contam como indisponibilidade; qualquer 4xx de validação/negócio, não.
 */
export function isProviderUnavailable(err: unknown): boolean {
  if (err instanceof FiscalProviderError) {
    return [408, 500, 502, 503, 504].includes(err.status);
  }
  return err instanceof Error && !(err instanceof FiscalProviderError);
}
