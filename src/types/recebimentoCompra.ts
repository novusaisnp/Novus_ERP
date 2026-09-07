export interface RecebimentoCompraItem {
  id: string;
  recebimento_id: string;
  pedido_item_id: string;
  produto_id: string;
  quantidade_recebida: number;
  observacao: string | null;
  estoque_movimentacao_id: string | null;
  created_at: string;
}

export interface RecebimentoCompra {
  id: string;
  empresa_representada_id: string;
  pedido_id: string;
  criado_por: string;
  data_recebimento: string;
  observacoes: string | null;
  created_at: string;
  itens: RecebimentoCompraItem[];
}

export interface ConfirmarRecebimentoItemInput {
  pedido_item_id: string;
  quantidade_recebida: number;
  localizacao_destino_id: string;
  observacao?: string;
}

export interface ConfirmarRecebimentoResultado {
  ok: boolean;
  recebimento_id: string;
  pedido_completo: boolean;
  contas_pagar_id: string | null;
}
