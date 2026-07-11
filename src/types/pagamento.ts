// FIN-E1: catálogo global da camada de pagamentos.

export type ModalidadePagamentoCodigo =
  | 'PIX'
  | 'DINHEIRO'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'BOLETO'
  | 'TRANSFERENCIA'
  | 'CREDIARIO';

export type NaturezaPagamentoCodigo =
  | 'AVISTA'
  | 'PARCELADO'
  | 'CREDIARIO_PROPRIO'
  | 'RECORRENTE';

export interface ModalidadePagamento {
  id: string;
  codigo: ModalidadePagamentoCodigo | string;
  nome: string;
  descricao: string | null;
  exige_adquirente: boolean;
  permite_parcelamento: boolean;
  liquidacao_imediata: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NaturezaPagamento {
  id: string;
  codigo: NaturezaPagamentoCodigo | string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PlanoPagamentoRegras {
  id: string;
  empresa_representada_id: string;
  nome: string;
  descricao: string | null;
  natureza_id: string | null;
  modalidade_default_id: string | null;
  qtd_parcelas: number;
  numero_parcelas: number;
  intervalo_dias: number;
  dias_primeira_parcela: number;
  percentual_entrada: number;
  juros_am: number;
  multa_perc: number;
  desconto_avista_perc: number;
  tolerancia_arredondamento: number;
  versao: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
