export interface DependenciaItem {
  tabela: string;
  label: string;
  count: number;
  bloqueia: boolean;
  on_delete: 'NO_ACTION' | 'RESTRICT' | 'CASCADE' | 'SET_NULL' | 'SET_DEFAULT';
}

export interface CheckDependenciasResult {
  entidade: string;
  id: string;
  pode_excluir: boolean;
  total_dependentes: number;
  total_bloqueantes: number;
  dependencias: DependenciaItem[];
  aviso?: string;
}
