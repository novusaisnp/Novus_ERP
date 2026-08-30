export interface AtivoFixo {
  id: string;
  empresa_representada_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  centro_custo_id: string | null;
  data_aquisicao: string;
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_meses: number;
  valor_depreciado_acumulado: number;
  ultima_competencia_depreciada: string | null;
  status: 'ATIVO' | 'BAIXADO';
  data_baixa: string | null;
  valor_baixa: number | null;
  motivo_baixa: string | null;
  created_at: string;
  updated_at: string;
}

export interface AtivoFixoInput {
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  centro_custo_id?: string | null;
  data_aquisicao: string;
  valor_aquisicao: number;
  valor_residual: number;
  vida_util_meses: number;
}

export interface DepreciacaoProcessadaItem {
  ativo_id: string;
  valor_depreciado: number;
  lancamento_id: string;
}

export interface BaixaAtivoFixoResultado {
  lancamento_id: string;
  valor_contabil: number;
  resultado: number;
}
