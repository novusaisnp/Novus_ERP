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
  cst?: string;
  csosn?: string;
  origem?: string;
  aliquotaIcms?: number;
  aliquotaIpi?: number;
  aliquotaPis?: number;
  aliquotaCofins?: number;
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
  raw: unknown;
}

export interface FiscalProvider {
  readonly name: FiscalProviderName;
  readonly environment: FiscalEnvironment;

  emitNFe(payload: NFeEmitPayload): Promise<NFeEmitResult>;
  cancelNFe(payload: NFeCancelPayload): Promise<NFeStatusResult>;
  consultNFeStatus(providerRef: string): Promise<NFeStatusResult>;
  sendCCe(payload: NFeCCePayload): Promise<NFeStatusResult>;
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
