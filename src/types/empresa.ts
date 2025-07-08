
export interface EmpresaResponsavel {
  id?: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  nomeResponsavel: string;
  contatos: {
    email: string;
    telefone: string;
    celular?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmpresaRepresentada {
  id?: string;
  empresaResponsavelId: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  qualificacaoFiscal: {
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
    porte: 'MEI' | 'ME' | 'EPP' | 'DEMAIS';
  };
  logomarca?: {
    url: string;
    filename: string;
  };
  configuracaoNF: {
    ambiente: 'PRODUCAO' | 'HOMOLOGACAO';
    certificadoDigital?: {
      arquivo: string;
      senha: string;
      validade: Date;
    };
    numeracaoNFe: number;
    numeracaoNFCe: number;
  };
  ativa: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Perfil {
  id?: string;
  nome: string;
  codigo: string;
  descricao: string;
  permissoes: string[];
  ativo: boolean;
  sistema: boolean; // Perfis do sistema não podem ser editados
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Usuario {
  id?: string;
  empresaRepresentadaId: string;
  nomeCompleto: string;
  cpf: string;
  email: string;
  perfilId: string;
  colaboradorId?: string;
  ativo: boolean;
  ultimoLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CNPJData {
  cnpj: string;
  nome: string;
  fantasia?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string; // Adicionando propriedade cep que estava faltando
  situacao: string;
  porte: string;
}

export interface CEPData {
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}
