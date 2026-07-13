// P12: Types do Módulo de Estoque
export type EstoqueMovimentacaoTipo =
  | 'ENTRADA'
  | 'SAIDA'
  | 'TRANSFERENCIA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'INVENTARIO';

export interface EstoqueMovimentacao {
  id: string;
  empresa_representada_id: string;
  produto_id: string;
  tipo: EstoqueMovimentacaoTipo;
  quantidade: number;
  custo_unitario: number;
  localizacao_origem_id: string | null;
  localizacao_destino_id: string | null;
  data_movimento: string;
  documento_ref: string | null;
  venda_id: string | null;
  inventario_id: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EstoqueMovimentacaoView extends EstoqueMovimentacao {
  produto_nome?: string;
  origem_nome?: string;
  destino_nome?: string;
}

export type EstoqueInventarioStatus = 'RASCUNHO' | 'EM_CONTAGEM' | 'CONCILIADO' | 'CANCELADO';

export interface EstoqueInventario {
  id: string;
  empresa_representada_id: string;
  codigo: string;
  localizacao_id: string | null;
  responsavel_id: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: EstoqueInventarioStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EstoqueInventarioItem {
  id: string;
  empresa_representada_id: string;
  inventario_id: string;
  produto_id: string;
  saldo_sistema: number;
  saldo_contado: number;
  diferenca: number;
  custo_unitario: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstoqueSaldo {
  id: string;
  empresa_representada_id: string;
  produto_id: string;
  localizacao_id: string;
  quantidade: number;
  custo_medio: number;
  updated_at: string;
}
