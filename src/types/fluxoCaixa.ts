export type TipoMovimentacao = 'ENTRADA' | 'SAIDA';
export type StatusMovimentacao = 'PREVISTO' | 'REALIZADO';
export type TipoFluxo = 'OPERACIONAL' | 'INVESTIMENTO' | 'FINANCIAMENTO';
export type PeriodoAgrupamento = 'DIARIO' | 'SEMANAL' | 'MENSAL';

export interface FluxoCaixaItem {
  id: string;
  data: string;
  tipo: TipoMovimentacao;
  descricao: string;
  valor: number;
  status: StatusMovimentacao;
  tipo_fluxo: TipoFluxo;
  conta_bancaria?: {
    id: string;
    titular: string;
    numero_conta: string;
  } | null;
  plano_conta?: {
    id: string;
    codigo: string;
    nome: string;
  };
  centro_custo?: {
    id: string;
    nome: string;
    codigo?: string;
  };
  titulo_origem?: {
    id: string;
    tipo: 'CONTAS_PAGAR' | 'CONTAS_RECEBER';
    numero_documento: string;
  };
  observacoes?: string;
}

export interface FluxoCaixaFiltros {
  data_inicio?: string;
  data_fim?: string;
  periodo_agrupamento?: PeriodoAgrupamento;
  tipo_movimento?: TipoMovimentacao | 'TODOS';
  status?: StatusMovimentacao | 'TODOS';
  tipo_fluxo?: TipoFluxo | 'TODOS';
  conta_bancaria_id?: string;
  plano_conta_id?: string;
  centro_custo_id?: string;
  busca?: string;
}

export interface FluxoCaixaResumo {
  total_entradas: number;
  total_saidas: number;
  saldo_atual: number;
  saldo_projetado_7d: number;
  saldo_projetado_14d: number;
  saldo_projetado_30d: number;
  capital_giro: number;
  runway_dias: number;
  saldo_minimo: number;
}

export interface FluxoCaixaProjecao {
  data: string;
  entradas_previstas: number;
  saidas_previstas: number;
  saldo_acumulado: number;
  cenario: 'OTIMISTA' | 'REALISTA' | 'PESSIMISTA';
}

export interface FluxoCaixaEstatisticas {
  periodo: string;
  total_movimentacoes: number;
  maior_entrada: FluxoCaixaItem;
  maior_saida: FluxoCaixaItem;
  media_diaria_entradas: number;
  media_diaria_saidas: number;
  tendencia_saldo: 'CRESCENTE' | 'ESTAVEL' | 'DECRESCENTE';
}

export interface FluxoCaixaGraficoData {
  data: string;
  entradas: number;
  saidas: number;
  saldo_acumulado: number;
  saldo_projetado?: number;
}

export interface FluxoCaixaDrillDown {
  titulo: FluxoCaixaItem;
  detalhes: {
    historico_movimentacoes: any[];
    documentos_anexos: any[];
    dados_originais: any;
  };
}