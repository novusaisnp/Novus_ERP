// FIN-E3: tipos da camada transacional de pagamento da venda
export type VendaPagamentoStatus =
  | 'PENDENTE' | 'AUTORIZADO' | 'CAPTURADO'
  | 'ESTORNADO_PARCIAL' | 'ESTORNADO_TOTAL' | 'FALHOU';

export type VendaPagamentoParcelaStatus =
  | 'ABERTA' | 'LIQUIDADA_PARCIAL' | 'LIQUIDADA' | 'CANCELADA';

export type OrigemCanal = 'ERP' | 'PDV' | 'ECOM' | 'API';

export interface VendaPagamentoParcela {
  id: string;
  empresa_representada_id: string;
  venda_pagamento_id: string;
  numero: number;
  valor: number;
  valor_juros: number;
  data_vencimento: string; // YYYY-MM-DD
  is_entrada: boolean;
  status: VendaPagamentoParcelaStatus;
  externo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendaPagamento {
  id: string;
  empresa_representada_id: string;
  venda_id: string;
  modalidade_id: string;
  plano_pagamento_id: string | null;
  natureza_id: string | null;
  plano_snapshot: Record<string, unknown>;
  valor_bruto: number;
  valor_desconto: number;
  valor_juros: number;
  valor_liquido: number;
  qtd_parcelas: number;
  percentual_entrada: number;
  autorizacao_nsu: string | null;
  bandeira: string | null;
  adquirente: string | null;
  status: VendaPagamentoStatus;
  origem_canal: OrigemCanal;
  origem_sistema: string | null;
  externo_id: string | null;
  idempotency_key: string | null;
  hash_payload: string | null;
  operador_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface VendaPagamentoInput {
  empresa_representada_id: string;
  venda_id: string;
  modalidade_id: string;
  plano_pagamento_id?: string | null;
  natureza_id?: string | null;
  plano_snapshot?: Record<string, unknown>;
  valor_bruto: number;
  valor_desconto?: number;
  valor_juros?: number;
  qtd_parcelas: number;
  percentual_entrada?: number;
  origem_canal?: OrigemCanal;
  origem_sistema?: string | null;
  externo_id?: string | null;
  idempotency_key?: string | null;
  operador_id?: string | null;
}

export interface ValidacaoErro {
  codigo: string;
  categoria: 'PERMISSAO' | 'TOTAL' | 'PARCELA' | 'POLITICA' | 'MODALIDADE' | 'PLANO' | 'TENANT';
  mensagem: string;
  campo?: string;
}

export interface ValidacaoAviso {
  codigo: string;
  mensagem: string;
  campo?: string;
}

export interface ValidacaoPagamentoResult {
  ok: boolean;
  erros: ValidacaoErro[];
  avisos: ValidacaoAviso[];
}
