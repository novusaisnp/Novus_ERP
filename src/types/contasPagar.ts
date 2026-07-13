export interface ContaPagar {
  id: string;
  empresa_representada_id?: string | null;
  numero_documento: string;
  descricao: string;
  fornecedor_id?: string;
  plano_conta_id?: string;
  centro_custo_id?: string;
  valor_original: number;
  valor_atual: number;
  data_vencimento: string;
  data_emissao: string;
  data_competencia?: string;
  situacao: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  observacoes?: string;
  anexos: string[];
  tags: string[];
  periodicidade?: 'UNICA' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  recorrente: boolean;
  conta_origem_id?: string;
  numero_parcela?: number;
  total_parcelas?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  rateios?: RateioContaPagar[];
  // Relacionamentos
  fornecedor?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string;
  };
  plano_conta?: {
    id: string;
    codigo: string;
    nome: string;
    tipo?: 'RECEITA' | 'DESPESA';
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo?: string;
  };
}

export interface RateioContaPagar {
  id?: string;
  plano_conta_id: string;
  centro_custo_id?: string;
  valor: number;
  percentual: number;
  descricao?: string;
  // Para exibição
  plano_conta?: {
    id: string;
    codigo: string;
    nome: string;
    tipo?: 'RECEITA' | 'DESPESA';
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo?: string;
  };
}

export interface ContaPagarInput {
  numero_documento: string;
  descricao: string;
  fornecedor_id?: string;
  plano_conta_id?: string;
  centro_custo_id?: string;
  valor_original: number;
  valor_atual: number;
  data_vencimento: string;
  data_emissao: string;
  data_competencia?: string;
  situacao?: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  observacoes?: string;
  anexos?: string[];
  tags?: string[];
  periodicidade?: 'UNICA' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  recorrente?: boolean;
  conta_origem_id?: string;
  numero_parcela?: number;
  total_parcelas?: number;
  ativo?: boolean;
  rateios?: RateioContaPagar[];
}

export interface ContaPagarFilters {
  busca?: string;
  situacao?: string;
  fornecedor_id?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  valor_min?: number;
  valor_max?: number;
}

export interface ContaPagarEstatisticas {
  total_contas: number;
  contas_abertas: number;
  contas_vencidas: number;
  contas_pagas: number;
  valor_total_aberto: number;
  valor_total_vencido: number;
  valor_total_pago: number;
}

export interface SupabaseContaPagar {
  id: string;
  empresa_representada_id?: string | null;
  numero_documento: string;
  descricao: string;
  fornecedor_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  valor_original: number;
  valor_atual: number;
  data_vencimento: string;
  data_emissao: string;
  data_competencia: string | null;
  situacao: string;
  observacoes: string | null;
  anexos: any;
  tags: any;
  periodicidade: string | null;
  recorrente: boolean;
  conta_origem_id: string | null;
  numero_parcela: number | null;
  total_parcelas: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
