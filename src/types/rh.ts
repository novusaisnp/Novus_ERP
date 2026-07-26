export interface Colaborador {
  id?: string;
  nomeCompleto: string;
  dataNascimento: Date;
  cpf: string;
  rg?: string;
  endereco?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  telefone?: string;
  emailPessoal?: string;
  emailCorporativo?: string;
  cargoId?: string;
  departamentoId?: string;
  setorId?: string;
  regimeContratacao: 'CLT' | 'PJ' | 'ESTAGIO' | 'TERCEIRIZADO';
  dataAdmissao: Date;
  dataDemissao?: Date;
  tipoContrato?: 'EFETIVO' | 'TEMPORARIO' | 'EXPERIENCIA';
  jornada?: {
    horasDiarias: number;
    diasSemana: number;
    horarioInicio?: string;
    horarioFim?: string;
  };
  regimeTrabalho?: 'PRESENCIAL' | 'REMOTO' | 'HIBRIDO';
  localTrabalho?: string;
  salarioBase?: number;
  adicionais?: {
    adicionalNoturno?: number;
    insalubridade?: number;
    periculosidade?: number;
  };
  documentacao?: {
    nisPis?: string;
    dadosBancarios?: {
      banco: string;
      agencia: string;
      conta: string;
      tipoConta: 'CORRENTE' | 'POUPANCA';
    };
    contratoUrl?: string;
  };
  pontoControle?: {
    matriculaPonto?: string;
    historicoFerias?: unknown[];
    afastamentos?: unknown[];
  };
  compliance: {
    aceiteLgpd: boolean;
    dataAceite?: Date;
    consentimentoDados: boolean;
  };
  empresaRepresentadaId: string;
  situacao: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Cargo {
  id?: string;
  nome: string;
  descricao?: string;
  salarioBase?: number;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Departamento {
  id?: string;
  nome: string;
  descricao?: string;
  empresaRepresentadaId?: string;
  responsavelId?: string;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FolhaPagamento {
  id?: string;
  colaboradorId: string;
  competencia: Date;
  salarioBase: number;
  horasExtras: number;
  adicionais: number;
  beneficios: number;
  descontos: number;
  encargos: number;
  totalBruto: number;
  totalLiquido: number;
  status: 'Pendente' | 'Processada' | 'Paga';
  observacoes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VencimentoPadrao {
  id?: string;
  codigo: string;
  descricao: string;
  tipo: 'FIXO' | 'PERCENTUAL' | 'HORAS';
  valor?: number;
  percentual?: number;
  incideInss: boolean;
  incideIrrf: boolean;
  incideFgts: boolean;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DescontoPadrao {
  id?: string;
  codigo: string;
  descricao: string;
  tipo: 'FIXO' | 'PERCENTUAL' | 'TABELA';
  valor?: number;
  percentual?: number;
  tabelaProgressiva?: unknown;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BeneficioVinculado {
  id?: string;
  colaboradorId: string;
  codigo: string;
  descricao: string;
  tipo: 'VT' | 'VR' | 'PLANO_SAUDE' | 'OUTROS';
  valor: number;
  descontoFolha: boolean;
  percentualDesconto?: number;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IntegracaoPonto {
  id?: string;
  nome: string;
  tipo: 'API' | 'UPLOAD';
  configuracao: unknown;
  urlApi?: string;
  tokenApi?: string;
  formatoArquivo?: 'CSV' | 'XLSX';
  mapeamentoCampos?: unknown;
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegistroPonto {
  id?: string;
  colaboradorId: string;
  dataPonto: Date;
  entradaManha?: string;
  saidaAlmoco?: string;
  voltaAlmoco?: string;
  saidaTarde?: string;
  horasTrabalhadas: number;
  horasExtras: number;
  observacoes?: string;
  origem: 'MANUAL' | 'API' | 'UPLOAD';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interfaces para transformação de dados do Supabase
export interface SupabaseColaborador {
  id: string;
  nome_completo: string;
  data_nascimento: string;
  cpf: string;
  rg?: string;
  endereco?: unknown;
  telefone?: string;
  email?: string;
  cargo_id?: string;
  departamento_id?: string;
  regime_contratacao: string;
  data_admissao: string;
  data_demissao?: string;
  salario_base?: number;
  empresa_representada_id: string;
  situacao: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCargo {
  id: string;
  nome: string;
  descricao?: string;
  salario_base?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseDepartamento {
  id: string;
  nome: string;
  descricao?: string;
  empresa_representada_id?: string;
  responsavel_id?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}
