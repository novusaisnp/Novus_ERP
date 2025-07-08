
export interface PlanoContas {
  id: string;
  codigo: string;
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  id_pai?: string;
  nivel: number;
  ativo: boolean;
  analitica: boolean;
  created_at: string;
  updated_at: string;
  filhos?: PlanoContas[];
}

export interface PlanoContasInput {
  nome: string;
  tipo: 'RECEITA' | 'DESPESA';
  id_pai?: string;
  ativo?: boolean;
  analitica?: boolean;
}

export interface PlanoContasNode extends PlanoContas {
  expanded?: boolean;
  children?: PlanoContasNode[];
}

export type SupabasePlanoContas = {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  id_pai: string | null;
  nivel: number;
  ativo: boolean;
  analitica: boolean;
  created_at: string;
  updated_at: string;
};
