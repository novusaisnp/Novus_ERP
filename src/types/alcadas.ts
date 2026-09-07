export interface AlcadaAprovacao {
  id: string;
  empresa_representada_id: string;
  categoria: string;
  valor_minimo: number;
  permissao_necessaria: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlcadaAprovacaoInput {
  categoria: string;
  valor_minimo: number;
  permissao_necessaria: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface AlcadaSubstituto {
  id: string;
  empresa_representada_id: string;
  aprovador_titular_id: string;
  aprovador_substituto_id: string;
  categoria: string | null;
  data_inicio: string;
  data_fim: string;
  motivo: string;
  criado_por: string;
  created_at: string;
}

export interface AlcadaSubstitutoInput {
  aprovador_titular_id: string;
  aprovador_substituto_id: string;
  categoria?: string | null;
  data_inicio: string;
  data_fim: string;
  motivo: string;
}

export type StatusSolicitacaoAprovacao =
  | 'PENDENTE'
  | 'APROVADO'
  | 'REJEITADO'
  | 'CANCELADO'
  | 'AUTO_APROVADO';

export interface SolicitacaoAprovacao {
  id: string;
  empresa_representada_id: string;
  categoria: string;
  valor: number;
  descricao: string;
  contexto: Record<string, unknown> | null;
  origem_tabela: string | null;
  origem_id: string | null;
  solicitante_id: string;
  alcada_id: string | null;
  permissao_necessaria: string | null;
  status: StatusSolicitacaoAprovacao;
  decidido_por: string | null;
  decidido_em: string | null;
  justificativa_decisao: string | null;
  substituicao_id: string | null;
  created_at: string;
}

export interface SolicitarAprovacaoInput {
  categoria: string;
  valor: number;
  descricao: string;
  contexto?: Record<string, unknown> | null;
  origem_tabela?: string | null;
  origem_id?: string | null;
}

export interface SolicitarAprovacaoResultado {
  ok: boolean;
  solicitacao_id: string;
  status: StatusSolicitacaoAprovacao;
}

export interface DecidirSolicitacaoResultado {
  ok: boolean;
  status: StatusSolicitacaoAprovacao;
}
