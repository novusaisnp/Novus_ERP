export type StatusRequisicaoCompra = 'ABERTA' | 'CANCELADA';

export interface RequisicaoCompraItem {
  id: string;
  requisicao_id: string;
  produto_id: string;
  quantidade: number;
  observacao: string | null;
  created_at: string;
}

export interface RequisicaoCompra {
  id: string;
  empresa_representada_id: string;
  solicitante_id: string;
  centro_custo_id: string | null;
  justificativa: string;
  data_necessidade: string | null;
  status: StatusRequisicaoCompra;
  created_at: string;
  updated_at: string;
  itens: RequisicaoCompraItem[];
}

export interface RequisicaoCompraItemInput {
  produto_id: string;
  quantidade: number;
  observacao?: string | null;
}

export interface RequisicaoCompraInput {
  centro_custo_id?: string | null;
  justificativa: string;
  data_necessidade?: string | null;
  itens: RequisicaoCompraItemInput[];
}
