
// Types para o submódulo de Configurações Básicas de Pagamentos

export interface NaturezaCaixa {
  id: string;
  nome: string;
  sigla: string;
  baixa: boolean;
  gera_troco: boolean;
  informa_valor_pago: boolean;
  baixa_pendente: boolean;
  pagamento_online: boolean;
  conta_convenio: boolean;
  mostra_troco: boolean;
  forma_nota_fiscal: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface NaturezaCaixaInput {
  nome: string;
  sigla: string;
  baixa: boolean;
  gera_troco: boolean;
  informa_valor_pago: boolean;
  baixa_pendente: boolean;
  pagamento_online: boolean;
  conta_convenio: boolean;
  mostra_troco: boolean;
  forma_nota_fiscal: boolean;
  ativo: boolean;
}

export interface ModalidadeCaixa {
  id: string;
  nome: string;
  sigla: string;
  ativo: boolean;
  indica_boleto: boolean;
  indica_cartao_credito: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ModalidadeCaixaInput {
  nome: string;
  sigla: string;
  ativo: boolean;
  indica_boleto: boolean;
  indica_cartao_credito: boolean;
}

export interface PlanoPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PlanoPagamentoInput {
  nome: string;
  ativo: boolean;
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
