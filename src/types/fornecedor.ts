
export type TipoPessoa = 'PJ' | 'PF';

export interface Telefone {
  numero: string;
  tipo: 'fixo' | 'celular';
  principal?: boolean;
}

export interface Endereco {
  [key: string]: any; // Para compatibilidade com Json do Supabase
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
}

export interface ContatoPrincipal {
  nome: string;
  cargo: string;
}

export interface DadosBancarios {
  banco: string;
  numero_banco?: string;
  agencia: string;
  conta: string;
  tipo_conta: 'corrente' | 'poupanca';
}

export interface ResponsavelPreenchimento {
  nome: string;
  cargo: string;
}

export interface AnexosPJ {
  contrato_social?: string;
  cartao_cnpj?: string;
  logotipo?: string;
  portfolio_anexo?: string;
}

export interface AnexosPF {
  comprovante_residencia?: string;
  copia_rg?: string;
  cartao_bancario?: string;
}

export interface Fornecedor {
  id?: string;
  tipo_pessoa?: TipoPessoa;
  
  // Campos comuns
  email?: string;
  endereco?: Endereco;
  endereco_correspondencia?: Endereco;
  usar_endereco_principal_correspondencia?: boolean;
  telefones?: Telefone[];
  dados_bancarios?: DadosBancarios;
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // Campos específicos PJ
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  data_fundacao?: Date;
  cnae?: string;
  capital_social?: number;
  anexos_pj?: AnexosPJ;
  contato_principal?: ContatoPrincipal;
  referencias_comerciais?: string;
  atividade_principal?: string;
  prazo_entrega_habitual?: string;
  responsavel_preenchimento?: ResponsavelPreenchimento;

  // Campos específicos PF
  nome_completo?: string;
  data_nascimento?: Date;
  cpf?: string;
  rg?: string;
  orgao_emissor_rg?: string;
  anexos_pf?: AnexosPF;
  referencias_pessoais?: string;
  horario_atendimento?: string;

  // Campos de compatibilidade (manter para não quebrar código existente)
  telefone?: string;
  qualificacaoFiscal?: {
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario?: string;
    porte?: string;
  };
}
