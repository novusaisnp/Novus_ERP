export type ContratoStatus =
  | 'RASCUNHO'
  | 'ATIVO'
  | 'SUSPENSO'
  | 'ENCERRADO'
  | 'CANCELADO';

export interface Contrato {
  id?: string;
  empresa_representada_id?: string;
  cliente_id?: string | null;
  numero_contrato?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo?: string | null;
  status: ContratoStatus;
  data_inicio?: string | null;
  data_fim?: string | null;
  valor_mensal?: number | null;
  valor_total?: number | null;
  dia_vencimento?: number | null;
  plano_pagamento_id?: string | null;
  renovacao_automatica?: boolean;
  gera_financeiro?: boolean;
  observacoes?: string | null;
  arquivo_url?: string | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  cliente?: { id: string; nome: string } | null;
}

export interface ContratoFiltros {
  status?: ContratoStatus | '';
  cliente_id?: string;
  busca?: string;
}
