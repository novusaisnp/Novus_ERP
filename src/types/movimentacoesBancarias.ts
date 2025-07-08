export type TipoMovimentacao = 
  | 'DEPOSITO' 
  | 'SAQUE' 
  | 'TRANSFERENCIA_SAIDA' 
  | 'TRANSFERENCIA_ENTRADA' 
  | 'AJUSTE_POSITIVO' 
  | 'AJUSTE_NEGATIVO';

export type TipoLote = 
  | 'TRANSFERENCIA_MULTIPLA' 
  | 'DEPOSITO_MULTIPLO' 
  | 'AJUSTE_MULTIPLO';

export type StatusLote = 'PROCESSANDO' | 'FINALIZADO' | 'CANCELADO';

export type TipoOperacaoHistorico = 
  | 'CRIACAO' 
  | 'EDICAO' 
  | 'ESTORNO' 
  | 'CONCILIACAO' 
  | 'EXCLUSAO';

export interface MovimentacaoBancaria {
  id: string;
  conta_bancaria_id: string;
  tipo_movimentacao: TipoMovimentacao;
  valor: number;
  descricao: string;
  data_movimentacao: string;
  documento_referencia?: string;
  observacoes?: string;
  
  // Dados para transferências
  conta_destino_id?: string;
  
  // Dados para conciliação
  conciliado: boolean;
  data_conciliacao?: string;
  usuario_conciliacao_id?: string;
  
  // Dados de controle
  estornado: boolean;
  data_estorno?: string;
  usuario_estorno_id?: string;
  motivo_estorno?: string;
  movimentacao_estorno_id?: string;
  
  // Lote
  lote_id?: string;
  
  // Auditoria
  usuario_criacao_id?: string;
  ip_origem?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relacionamentos
  conta_bancaria?: {
    id: string;
    numero_conta: string;
    titular: string;
    agencia?: {
      numero_agencia: string;
      banco: {
        codigo: string;
        nome: string;
      };
    };
  };
  conta_destino?: {
    id: string;
    numero_conta: string;
    titular: string;
    agencia?: {
      numero_agencia: string;
      banco: {
        codigo: string;
        nome: string;
      };
    };
  };
  lote?: LoteMovimentacao;
}

export interface MovimentacaoBancariaInput {
  conta_bancaria_id: string;
  tipo_movimentacao: TipoMovimentacao;
  valor: number;
  descricao: string;
  data_movimentacao: string;
  documento_referencia?: string;
  observacoes?: string;
  conta_destino_id?: string;
}

export interface LoteMovimentacao {
  id: string;
  numero_lote: string;
  descricao_lote: string;
  tipo_lote: TipoLote;
  valor_total: number;
  quantidade_movimentacoes: number;
  status: StatusLote;
  usuario_criacao_id?: string;
  ip_origem?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentoMovimentacao {
  id: string;
  movimentacao_id: string;
  nome_arquivo: string;
  nome_original: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  url_arquivo: string;
  categoria?: string;
  descricao?: string;
  usuario_upload_id?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface HistoricoMovimentacao {
  id: string;
  movimentacao_id: string;
  tipo_operacao: TipoOperacaoHistorico;
  dados_anteriores?: any;
  dados_novos?: any;
  observacoes?: string;
  usuario_id?: string;
  usuario_nome?: string;
  ip_origem?: string;
  data_operacao: string;
  created_at: string;
}

export interface FiltrosMovimentacoes {
  conta_bancaria_id?: string;
  tipo_movimentacao?: TipoMovimentacao | 'TODOS';
  data_inicio?: string;
  data_fim?: string;
  valor_min?: number;
  valor_max?: number;
  conciliado?: boolean;
  estornado?: boolean;
  busca?: string;
  documento_referencia?: string;
  lote_id?: string;
  incluir_inativos?: boolean;
}

export interface EstatisticasMovimentacoes {
  total_movimentacoes: number;
  total_depositos: number;
  total_saques: number;
  total_transferencias: number;
  total_ajustes: number;
  valor_total_entradas: number;
  valor_total_saidas: number;
  saldo_liquido: number;
  movimentacoes_conciliadas: number;
  movimentacoes_estornadas: number;
}

export interface TransferenciaBancaria {
  conta_origem_id: string;
  conta_destino_id: string;
  valor: number;
  descricao: string;
  data_movimentacao: string;
  documento_referencia?: string;
  observacoes?: string;
}

export interface EstornoMovimentacao {
  movimentacao_id: string;
  motivo_estorno: string;
  observacoes?: string;
}

export interface ConciliacaoMovimentacao {
  movimentacao_id: string;
  observacoes?: string;
}