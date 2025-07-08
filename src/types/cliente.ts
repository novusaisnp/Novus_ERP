
import { Setor } from './setor';
import { ContatoEmpresa } from './contato';

export interface Cliente {
  id?: string;
  nome: string;
  apelido?: string;
  emails?: string[];
  telefones?: string[];
  cpfCnpj?: string;
  tipo: 'F' | 'J';
  rg?: string;
  dataNascimento?: string;
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    pais?: string;
  };
  qualificacaoFiscal?: {
    inscricaoEstadual?: string;
    inscricaoMunicipal?: string;
    regimeTributario?: string;
    porte?: string;
  };
  // Campos específicos PF
  dadosPessoais?: {
    estadoCivil?: string;
    profissao?: string;
    escolaridade?: string;
    meiosComunicacaoPreferenciais?: string[];
  };
  // Campos específicos PJ
  dadosEmpresa?: {
    nomeFantasia?: string;
    cnae?: string;
    site?: string;
    formaAtuacao?: string;
    dataFundacao?: string;
    atividadePrincipal?: string;
    contatoEmpresa?: {
      nomeCompleto?: string;
      departamento?: string;
      cargo?: string;
    };
  };
  // Nova estrutura de contatos para PJ
  contatos?: ContatoEmpresa[];
  // Setor da empresa para integração CRM
  setor?: Setor;
  setorId?: string;
  // Documentos anexados
  documentos?: {
    id: string;
    nome: string;
    tipo: string;
    url: string;
  }[];
  ativo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
