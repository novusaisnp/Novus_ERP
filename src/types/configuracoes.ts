
export interface CentroCusto {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CentroCustoInput {
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
}

export interface SupabaseCentroCusto {
  id: string;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
