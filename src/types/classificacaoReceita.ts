export type AlvoTipoRegra = 'PRODUTO' | 'SERVICO' | 'CONTRATO' | 'CATEGORIA' | 'TIPO' | 'EMPRESA';
export type TipoItem = 'P' | 'S' | 'C';

export interface NaturezaReceita {
  id: string;
  empresa_representada_id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegraClassificacaoReceita {
  id: string;
  empresa_representada_id: string;
  alvo_tipo: AlvoTipoRegra;
  alvo_id?: string | null;
  tipo_item?: TipoItem | null;
  categoria_id?: string | null;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  natureza_receita_id?: string | null;
  prioridade: number;
  versao: number;
  vigencia_ini?: string | null;
  vigencia_fim?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegraClassificacaoInput {
  empresa_representada_id: string;
  alvo_tipo: AlvoTipoRegra;
  alvo_id?: string | null;
  tipo_item?: TipoItem | null;
  categoria_id?: string | null;
  plano_conta_id?: string | null;
  centro_custo_id?: string | null;
  natureza_receita_id?: string | null;
  prioridade?: number;
  versao?: number;
  vigencia_ini?: string | null;
  vigencia_fim?: string | null;
  ativo?: boolean;
}

export interface ClassificacaoResolvida {
  plano_conta_id: string;
  centro_custo_id: string | null;
  natureza_receita_id: string | null;
  regra_origem: string;
  regra_versao: number;
  hash_classificacao: string;
}
