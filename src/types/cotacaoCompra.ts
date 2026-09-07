export type StatusCotacaoCompra = 'ABERTA' | 'FECHADA' | 'CANCELADA';

export interface CotacaoCompraFornecedor {
  id: string;
  cotacao_id: string;
  fornecedor_id: string;
  convidado_em: string;
  respondido_em: string | null;
}

export interface CotacaoCompraPreco {
  id: string;
  cotacao_id: string;
  requisicao_item_id: string;
  fornecedor_id: string;
  preco_unitario: number;
  prazo_entrega_dias: number | null;
  observacao: string | null;
  vencedor: boolean;
  created_at: string;
  updated_at: string;
}

export interface CotacaoCompra {
  id: string;
  empresa_representada_id: string;
  requisicao_id: string;
  criado_por: string;
  status: StatusCotacaoCompra;
  prazo_resposta: string | null;
  observacoes: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  created_at: string;
  updated_at: string;
  fornecedores: CotacaoCompraFornecedor[];
  precos: CotacaoCompraPreco[];
}

export interface CotacaoCompraInput {
  requisicao_id: string;
  prazo_resposta?: string | null;
  observacoes?: string | null;
  fornecedor_ids: string[];
}

export interface RegistrarPrecoInput {
  cotacao_id: string;
  requisicao_item_id: string;
  fornecedor_id: string;
  preco_unitario: number;
  prazo_entrega_dias?: number | null;
  observacao?: string | null;
}
