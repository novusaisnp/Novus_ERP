export type VendaStatus =
  | 'RASCUNHO'
  | 'CONFIRMADO'
  | 'EM_PRODUCAO'
  | 'FATURADO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface ItemVenda {
  id?: string;
  venda_id?: string;
  produto_id?: string | null;
  servico_id?: string | null;
  tipo_item?: 'P' | 'S';
  descricao: string;
  quantidade: number;
  unidade?: string | null;
  preco_unitario: number;
  desconto_item?: number;
  acrescimo_item?: number;
  valor_total_item?: number;
  ordem?: number;
  observacoes?: string | null;
}

export interface Venda {
  id?: string;
  empresa_representada_id?: string;
  cliente_id?: string | null;
  numero_venda?: string | null;
  data_venda: string;
  data_entrega_prevista?: string | null;
  status: VendaStatus;
  origem?: string | null;
  canal_venda?: string | null;
  subtotal?: number;
  desconto?: number;
  acrescimo?: number;
  valor_frete?: number;
  valor_total?: number;
  plano_pagamento_id?: string | null;
  vendedor_id?: string | null;
  observacoes?: string | null;
  observacoes_internas?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  itens?: ItemVenda[];
  cliente?: { id: string; nome: string } | null;
  vendedor?: { id: string; nome: string } | null;
}

export interface VendaFiltros {
  status?: VendaStatus | '';
  data_inicio?: string;
  data_fim?: string;
  busca?: string;
}
