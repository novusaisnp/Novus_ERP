export type TipoCampoPersonalizado = 'texto' | 'numero' | 'data' | 'booleano' | 'selecao';

export interface CampoPersonalizado {
  id: string;
  empresa_representada_id: string;
  entidade: 'entidades';
  chave: string;
  rotulo: string;
  tipo: TipoCampoPersonalizado;
  opcoes: string[] | null;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type CampoPersonalizadoInput = Pick<
  CampoPersonalizado,
  'empresa_representada_id' | 'chave' | 'rotulo' | 'tipo' | 'opcoes' | 'obrigatorio' | 'ordem' | 'ativo'
> & { entidade?: 'entidades' };
