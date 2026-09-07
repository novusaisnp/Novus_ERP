export type StatusPedidoCompra =
  | 'RASCUNHO'
  | 'AGUARDANDO_APROVACAO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'EMITIDO'
  | 'RECEBIDO'
  | 'CANCELADO';

export interface PedidoCompraItem {
  id: string;
  pedido_id: string;
  requisicao_item_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  created_at: string;
}

export interface PedidoCompra {
  id: string;
  empresa_representada_id: string;
  cotacao_id: string;
  requisicao_id: string;
  fornecedor_id: string;
  criado_por: string;
  status: StatusPedidoCompra;
  solicitacao_aprovacao_id: string | null;
  observacoes: string | null;
  emitido_em: string | null;
  contas_pagar_id: string | null;
  created_at: string;
  updated_at: string;
  itens: PedidoCompraItem[];
}

export interface EnviarParaAprovacaoResultado {
  ok: boolean;
  status: StatusPedidoCompra;
  valor_total: number;
}
