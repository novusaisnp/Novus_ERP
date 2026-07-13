// P15.2 — Tipos do módulo de Conciliação Bancária
export type StatusConciliacao = "PENDENTE" | "SUGERIDO" | "CONCILIADO" | "IGNORADO";
export type StatusExtrato = "IMPORTADO" | "PROCESSADO" | "ERRO" | "REVERTIDO";

export interface ExtratoImportado {
  id: string;
  empresa_representada_id: string;
  conta_bancaria_id: string;
  nome_arquivo: string;
  hash_arquivo: string;
  formato: string;
  data_inicial: string | null;
  data_final: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  status: StatusExtrato;
  total_lancamentos: number;
  erro_mensagem: string | null;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LinhaExtrato {
  id: string;
  empresa_representada_id: string;
  extrato_importado_id: string;
  conta_bancaria_id: string;
  fit_id: string | null;
  data_movimento: string;
  valor: number;
  descricao: string;
  historico: string | null;
  tipo: string;
  documento: string | null;
  status_conciliacao: StatusConciliacao;
  movimentacao_bancaria_id: string | null;
  regra_id: string | null;
  score_match: number | null;
  grupo_conciliacao_id: string | null;
  conciliado_em: string | null;
  conciliado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegraConciliacao {
  id: string;
  empresa_representada_id: string;
  nome: string;
  prioridade: number;
  ativa: boolean;
  tipo: string;
  padrao: string | null;
  tolerancia_valor: number | null;
  tolerancia_dias: number | null;
  natureza_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  contraparte_tipo: string | null;
  contraparte_id: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SugestaoMatchResult {
  ok: boolean;
  extrato_id: string;
  processadas: number;
  conciliadas_auto: number;
  sugeridas: number;
  pendentes: number;
}

export type TipoRegra = "PALAVRA_CHAVE" | "VALOR_EXATO" | "REGEX" | "CONTRAPARTE";
export type ContraparteTipo = "CLIENTE" | "FORNECEDOR";

export interface RegraConciliacaoInput {
  nome: string;
  prioridade: number;
  ativa: boolean;
  tipo: TipoRegra;
  padrao: string | null;
  tolerancia_valor: number;
  tolerancia_dias: number;
  natureza_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  contraparte_tipo: ContraparteTipo | null;
  contraparte_id: string | null;
  observacoes: string | null;
}
