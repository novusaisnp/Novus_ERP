
// Types para o submódulo de Configurações Básicas de Pagamentos

// NaturezaCaixa/ModalidadeCaixa não modelam mais comportamento de PDV/caixa (troco,
// baixa automática, pagamento online) — essa tabela foi redesenhada para
// classificação contábil (centro de custo / plano de contas). Nenhuma tela usa mais
// naturezaCaixasService/modalidadeCaixasService hoje (usePagamentoCatalogo os
// substituiu); os tipos aqui só existem para o service continuar compilando.
export interface NaturezaCaixa {
  id: string;
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
  tipo?: string | null;
  centro_custo_id?: string | null;
  plano_conta_id?: string | null;
  permite_estorno: boolean;
  requer_documento: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface NaturezaCaixaInput {
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
  tipo?: string | null;
  centro_custo_id?: string | null;
  plano_conta_id?: string | null;
  permite_estorno?: boolean;
  requer_documento?: boolean;
  ordem?: number;
  ativo?: boolean;
}

export interface ModalidadeCaixa {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo?: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModalidadeCaixaInput {
  nome: string;
  descricao?: string | null;
  tipo?: string | null;
  ordem?: number;
  ativo?: boolean;
}

export interface PlanoPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  natureza_id?: string | null;
  modalidade_default_id?: string | null;
  qtd_parcelas?: number | null;
  dias_primeira_parcela?: number | null;
  intervalo_dias?: number | null;
  percentual_entrada?: number | null;
  juros_am?: number | null;
  desconto_avista_perc?: number | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PlanoPagamentoInput {
  nome: string;
  ativo: boolean;
  natureza_id?: string | null;
  modalidade_default_id?: string | null;
  qtd_parcelas?: number | null;
  dias_primeira_parcela?: number | null;
  intervalo_dias?: number | null;
  percentual_entrada?: number | null;
  juros_am?: number | null;
  desconto_avista_perc?: number | null;
}

export interface ModalidadeAPIVinculo {
  id: string;
  nome: string;
  codigo_externo?: string | null;
  descricao?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ModalidadeAPIVinculoInput {
  nome: string;
  codigo_externo?: string;
  descricao?: string;
  ativo: boolean;
}

console.log('[ConfigBasicas] Types definidos');
