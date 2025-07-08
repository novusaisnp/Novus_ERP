
export interface Banco {
  id: string;
  codigo: string;
  nome: string;
  sigla?: string;
  pais: string;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BancoInput {
  codigo: string;
  nome: string;
  sigla?: string;
  pais: string;
  ativo: boolean;
}

export interface SupabaseBanco {
  id: string;
  codigo: string;
  nome: string;
  sigla: string | null;
  pais: string;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BancoBrasilAPI {
  ispb: string;
  name: string;
  code: number;
  fullName: string;
}
