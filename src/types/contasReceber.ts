// Enums alinhados ao schema real do banco (public.contas_receber.status)
export type ContaReceberStatus =
  | 'PENDENTE'
  | 'RECEBIDO'
  | 'PARCIAL'
  | 'VENCIDO'
  | 'CANCELADO';

// Alias legado ("situacao") mantido para compatibilidade da UI já existente.
export type ContaReceberSituacao = ContaReceberStatus;

export interface ContaReceber {
  id: string;
  empresa_representada_id: string;
  numero_documento?: string | null;
  descricao: string;
  cliente_id?: string | null;
  valor_original: number;
  valor_recebido?: number | null;
  valor_desconto?: number | null;
  valor_juros?: number | null;
  valor_multa?: number | null;
  data_emissao?: string | null;
  data_vencimento: string;
  data_recebimento?: string | null;
  status: ContaReceberStatus;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  natureza_id?: string | null;
  plano_pagamento_id?: string | null;
  numero_parcela?: number | null;
  total_parcelas?: number | null;
  observacoes?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;

  // FIN-E5: rastreabilidade de origem (opcional)
  venda_id?: string | null;
  venda_pagamento_id?: string | null;
  venda_pagamento_parcela_id?: string | null;
  origem_canal?: string | null;
  origem_sistema?: string | null;
  externo_id?: string | null;
  idempotency_key?: string | null;
  hash_payload?: string | null;
  created_by?: string | null;

  // Aliases legados para não quebrar componentes já existentes.
  situacao: ContaReceberStatus;
  valor_pago?: number | null;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;

  // Relacionamento
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string | null;
  } | null;
}

export interface ContaReceberInput {
  empresa_representada_id: string;
  descricao: string;
  numero_documento?: string | null;
  cliente_id?: string | null;
  valor_original: number;
  valor_recebido?: number | null;
  valor_desconto?: number | null;
  data_emissao?: string | null;
  data_vencimento: string;
  data_recebimento?: string | null;
  status?: ContaReceberStatus;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  natureza_id?: string | null;
  observacoes?: string | null;
}

export interface ContaReceberFilters {
  busca?: string;
  situacao?: string; // aceita valores do enum de status
  cliente_id?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  valor_min?: number;
  valor_max?: number;
  forma_pagamento?: string; // legado — ignorado no filtro do banco
  venda_id?: string;
}

export interface ContaReceberEstatisticas {
  total_contas: number;
  contas_abertas: number;
  contas_vencidas: number;
  contas_recebidas: number;
  valor_total_aberto: number;
  valor_total_vencido: number;
  valor_total_recebido: number;
}
