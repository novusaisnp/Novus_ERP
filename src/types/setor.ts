export interface Setor {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  departamento_id?: string | null;
  ativo?: boolean;
  created_at?: Date;
  updated_at?: Date;
}
