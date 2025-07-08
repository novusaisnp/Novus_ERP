export interface ContaReceber {
  id: string;
  numero_documento: string;
  cliente_id?: string;
  venda_id?: string;
  contrato_id?: string;
  valor_original: number;
  valor_pago?: number;
  valor_desconto?: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  situacao: 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  observacoes?: string;
  source_system?: string;
  sync_metadata?: any;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  cliente?: {
    id: string;
    nome: string;
    cpf_cnpj?: string;
  };
  venda?: {
    id: string;
    numero_pedido?: string;
  };
  contrato?: {
    id: string;
    numero_contrato: string;
  };
}

export interface ContaReceberInput {
  numero_documento: string;
  cliente_id?: string;
  venda_id?: string;
  contrato_id?: string;
  valor_original: number;
  valor_pago?: number;
  valor_desconto?: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  situacao?: 'ABERTA' | 'RECEBIDA' | 'VENCIDA' | 'CANCELADA';
  observacoes?: string;
  source_system?: string;
  sync_metadata?: any;
}

export interface ContaReceberFilters {
  busca?: string;
  situacao?: string;
  cliente_id?: string;
  data_vencimento_inicio?: string;
  data_vencimento_fim?: string;
  valor_min?: number;
  valor_max?: number;
  forma_pagamento?: string;
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

export interface SupabaseContaReceber {
  id: string;
  numero_documento: string;
  cliente_id: string | null;
  venda_id: string | null;
  contrato_id: string | null;
  valor_original: number;
  valor_pago: number | null;
  valor_desconto: number | null;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  situacao: string;
  observacoes: string | null;
  source_system: string | null;
  sync_metadata: any;
  created_at: string;
  updated_at: string;
}