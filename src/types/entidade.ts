export type TipoPessoaEntidade = 'PF' | 'PJ';

export type PapelCodigo = 'CLIENTE' | 'FORNECEDOR' | 'PRESTADOR' | 'COLABORADOR' | 'SOCIO' | 'REPRESENTANTE_LEGAL' | 'PROCURADOR';

export const PAPEIS_CATALOGO: { codigo: PapelCodigo; label: string; tipoPessoaPermitido: TipoPessoaEntidade | 'AMBOS' }[] = [
  { codigo: 'CLIENTE', label: 'Cliente', tipoPessoaPermitido: 'AMBOS' },
  { codigo: 'FORNECEDOR', label: 'Fornecedor', tipoPessoaPermitido: 'AMBOS' },
  { codigo: 'PRESTADOR', label: 'Prestador de Serviço', tipoPessoaPermitido: 'AMBOS' },
  { codigo: 'COLABORADOR', label: 'Colaborador', tipoPessoaPermitido: 'PF' },
  { codigo: 'SOCIO', label: 'Sócio', tipoPessoaPermitido: 'PF' },
  { codigo: 'REPRESENTANTE_LEGAL', label: 'Representante Legal', tipoPessoaPermitido: 'PF' },
  { codigo: 'PROCURADOR', label: 'Procurador', tipoPessoaPermitido: 'PF' },
];

export interface DadosColaborador {
  cargoId?: string | null;
  departamentoId?: string | null;
  setorId?: string | null;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  tipoContrato?: string | null;
  regimeTrabalho?: string | null;
  cargaHoraria?: number | null;
  salario?: number | null;
  pis?: string | null;
  ctps?: string | null;
  serieCtps?: string | null;
}

export interface Entidade {
  id?: string;
  empresaRepresentadaId: string;
  tipoPessoa: TipoPessoaEntidade;
  papeis: PapelCodigo[];

  nome: string;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  apelido?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  rg?: string | null;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  indicadorIe?: '1' | '2' | '9' | null;
  consumidorFinal?: boolean | null;
  dataNascimento?: string | null;
  dataFundacao?: string | null;

  email?: string | null;
  emailSecundario?: string | null;
  telefone?: string | null;
  telefoneSecundario?: string | null;
  celular?: string | null;
  whatsapp?: string | null;
  website?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;

  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipoConta?: string | null;
  pix?: string | null;

  limiteCredito?: number | null;
  prazoEntrega?: number | null;
  observacoes?: string | null;
  ativo: boolean;

  dadosColaborador?: DadosColaborador;
}
