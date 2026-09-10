export interface FichaTecnica {
  id: string;
  empresa_representada_id: string;
  produto_id: string;
  nome: string;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FichaTecnicaItem {
  id: string;
  empresa_representada_id: string;
  ficha_tecnica_id: string;
  produto_insumo_id: string;
  quantidade: number;
  created_at: string;
}

export interface FichaTecnicaComItens extends FichaTecnica {
  itens: FichaTecnicaItem[];
}

export interface FichaTecnicaItemInput {
  produto_insumo_id: string;
  quantidade: number;
}

export interface FichaTecnicaInput {
  produto_id: string;
  nome: string;
  observacoes?: string | null;
  itens: FichaTecnicaItemInput[];
}

export type OrdemFabricacaoStatus = 'RASCUNHO' | 'CONCLUIDA' | 'CANCELADA';

export interface OrdemFabricacaoConsumo {
  id: string;
  empresa_representada_id: string;
  ordem_id: string;
  produto_insumo_id: string;
  quantidade_planejada: number;
  quantidade_consumida: number | null;
  custo_unitario: number | null;
  estoque_movimentacao_id: string | null;
  created_at: string;
}

export interface OrdemFabricacao {
  id: string;
  empresa_representada_id: string;
  ficha_tecnica_id: string;
  produto_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number | null;
  localizacao_consumo_id: string;
  localizacao_producao_id: string;
  status: OrdemFabricacaoStatus;
  custo_total_producao: number | null;
  custo_unitario_producao: number | null;
  centro_custo_id: string | null;
  data_abertura: string;
  data_conclusao: string | null;
  motivo_cancelamento: string | null;
  observacoes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  consumos: OrdemFabricacaoConsumo[];
}

export interface CriarOrdemFabricacaoInput {
  ficha_tecnica_id: string;
  quantidade_planejada: number;
  localizacao_consumo_id: string;
  localizacao_producao_id: string;
  centro_custo_id?: string | null;
  observacoes?: string | null;
}

export interface ConcluirOrdemFabricacaoConsumoInput {
  produto_insumo_id: string;
  quantidade_consumida: number;
}

export interface ConcluirOrdemFabricacaoInput {
  ordem_id: string;
  quantidade_produzida: number;
  consumos?: ConcluirOrdemFabricacaoConsumoInput[];
}

export interface ConcluirOrdemFabricacaoResultado {
  ok: boolean;
  ordem_id: string;
  quantidade_produzida: number;
  custo_total_producao: number;
  custo_unitario_producao: number;
  lancamento_id: string | null;
}
