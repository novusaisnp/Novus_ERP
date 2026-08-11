export type TipoTitulo = 'CONTAS_PAGAR' | 'CONTAS_RECEBER';

export type StatusTitulo = 'ABERTA' | 'PARCIAL' | 'PAGA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';

export type TipoMovimentacao = 'LIQUIDACAO' | 'ESTORNO' | 'EDICAO' | 'CANCELAMENTO';

export type FormaPagamento = 
  | 'DINHEIRO' 
  | 'TRANSFERENCIA' 
  | 'BOLETO' 
  | 'CARTAO_CREDITO' 
  | 'CARTAO_DEBITO' 
  | 'PIX' 
  | 'CHEQUE' 
  | 'DEPOSITO';

// Título unificado para exibição no modal
export interface TituloFinanceiro {
  id: string;
  tipo: TipoTitulo;
  numero_documento: string;
  descricao?: string;
  valor_original: number;
  valor_atual?: number;
  valor_pago?: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  situacao: StatusTitulo;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  pessoa?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
    tipo?: 'cliente' | 'fornecedor';
  };
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
}

// Liquidação/Baixa de título
export interface LiquidacaoTitulo {
  titulo_id: string;
  tipo_titulo: TipoTitulo;
  idempotency_key: string;
  valor_pago: number;
  data_pagamento: string;
  forma_pagamento: FormaPagamento;
  conta_bancaria_id?: string;
  observacoes?: string;
  multi_baixa?: MultiBaixa[];
}

// Para permitir dividir pagamento em múltiplas contas
export interface MultiBaixa {
  conta_bancaria_id: string;
  valor: number;
  observacoes?: string;
}

// Histórico de movimentações
export interface HistoricoMovimentacao {
  id: string;
  titulo_id: string;
  tipo_titulo: TipoTitulo;
  tipo_movimentacao: TipoMovimentacao;
  dados_anteriores?: unknown;
  dados_novos?: unknown;
  valor_movimentado?: number;
  data_movimentacao: string;
  usuario_id: string;
  usuario_nome?: string;
  ip_origem?: string;
  observacoes?: string;
  created_at: string;
}

// Filtros para consulta de títulos
export interface FiltrosMovimentacao {
  busca?: string;
  tipo_titulo?: TipoTitulo | 'TODOS';
  situacao?: StatusTitulo | 'TODOS';
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
  pessoa_id?: string;
  centro_custo_id?: string;
  plano_conta_id?: string;
  conta_bancaria_id?: string;
  usuario_id?: string;
  incluir_cancelados?: boolean;
}

// Permissões específicas para movimentações
export interface PermissoesMovimentacao {
  pode_liquidar: boolean;
  pode_estornar: boolean;
  pode_editar: boolean;
  pode_cancelar: boolean;
  pode_visualizar_historico: boolean;
  pode_editar_rateio: boolean;
}

// Dados para edição de título
export interface EdicaoTitulo {
  titulo_id: string;
  tipo_titulo: TipoTitulo;
  dados_atuais: unknown;
  dados_novos: unknown;
  motivo_edicao?: string;
}

// Dados para cancelamento de título
export interface CancelamentoTitulo {
  titulo_id: string;
  tipo_titulo: TipoTitulo;
  motivo_cancelamento: string;
  data_cancelamento: string;
}

// Estatísticas do modal
export interface EstatisticasMovimentacao {
  total_titulos: number;
  total_abertos: number;
  total_pagos: number;
  total_vencidos: number;
  total_cancelados: number;
  valor_total_aberto: number;
  valor_total_pago: number;
  valor_total_vencido: number;
}

export interface LiquidacaoRegistrada {
  id: string;
  conta_bancaria_id?: string | null;
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento?: string;
  observacoes?: string;
  conta_bancaria?: {
    id: string;
    numero_conta: string;
    nome_titular?: string;
  } | null;
}

export interface EstornoLiquidacao {
  liquidacao_id: string;
  motivo: string;
  idempotency_key: string;
}
