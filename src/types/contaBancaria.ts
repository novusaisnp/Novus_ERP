
export interface ContaBancaria {
  id: string;
  agencia_id?: string | null;
  numero_conta: string;
  digito_verificador: string;
  tipo_conta: string;
  titular: string;
  cpf_cnpj_titular: string;
  descricao_conta?: string | null;
  saldo_inicial: number;
  saldo_atual: number;
  limite_credito?: number | null;
  limite_disponivel?: number | null;
  data_abertura: string;
  data_encerramento?: string | null;
  status: string;
  conta_cofre: boolean;
  configuracoes?: any | null; // Mudança para aceitar Json do Supabase
  observacoes?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  
  // Dados relacionados
  agencia?: {
    numero_agencia: string;
    descricao: string;
    banco: {
      codigo: string;
      nome: string;
    };
  } | null;
}

export interface ContaBancariaInput {
  agencia_id?: string | null;
  numero_conta: string;
  digito_verificador: string;
  tipo_conta: string;
  titular: string;
  cpf_cnpj_titular: string;
  descricao_conta?: string | null;
  saldo_inicial: number;
  limite_credito?: number | null;
  data_abertura: string;
  data_encerramento?: string | null;
  status?: string;
  conta_cofre: boolean;
  configuracoes?: any | null; // Mudança para aceitar Json do Supabase
  observacoes?: string | null;
}

export interface ContaBancariaFilters {
  numero_conta?: string;
  titular?: string;
  tipo_conta?: string;
  status?: string;
  agencia_id?: string;
  banco_id?: string;
  conta_cofre?: boolean;
  incluir_arquivadas?: boolean;
}

export interface ContaBancariaEstatisticas {
  total: number;
  ativas: number;
  inativas: number;
  contas_corrente: number;
  contas_poupanca: number;
  contas_cofre: number;
  saldo_total: number;
  limite_total: number;
}
