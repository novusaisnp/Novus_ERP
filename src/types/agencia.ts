export interface EnderecoAgencia {
  rua?: string;
  numero?: string;
  complemento?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  [key: string]: unknown; // Index signature para compatibilidade com Json
}

export interface Agencia {
  id: string;
  banco_id: string;
  numero_agencia: string;
  descricao: string;
  endereco?: EnderecoAgencia;
  telefone?: string;
  ativo: boolean;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
  banco?: {
    id: string;
    codigo: string;
    nome: string;
    sigla?: string;
  };
}

export interface AgenciaInput {
  banco_id: string;
  numero_agencia: string;
  descricao: string;
  endereco?: EnderecoAgencia;
  telefone?: string;
  ativo?: boolean;
}

export interface SupabaseAgencia {
  id: string;
  banco_id: string;
  numero_agencia: string;
  descricao: string;
  endereco: unknown;
  telefone: string | null;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  bancos?: {
    id: string;
    codigo: string;
    nome: string;
    sigla: string | null;
  };
}

export interface AgenciaFilters {
  banco_id?: string;
  numero_agencia?: string;
  ativo?: boolean;
  incluirArquivadas?: boolean;
}

export interface AgenciaStats {
  total: number;
  ativas: number;
  inativas: number;
  arquivadas: number;
}
