
export interface ConfiguracaoFiscal {
  id?: string;
  empresaRepresentadaId: string;
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  provedor: 'FOCUS_NFE';
  regimeTributario: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL' | 'MEI';
  cnpjEmitente: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  serieNfe: number;
  proximoNumeroNfe?: number;
  serieNfce?: number;
  proximoNumeroNfce?: number;
  serieMdfe?: number;
  proximoNumeroMdfe?: number;
  rntrc?: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NaturezaOperacao {
  id: string;
  codigo: string;
  descricao: string;
  tipo: 'venda' | 'compra' | 'remessa' | 'devolucao' | 'transferencia';
  finalidade: 'normal' | 'complementar' | 'ajuste' | 'devolucao';
  cfopDentroEstado?: string;
  cfopForaEstado?: string;
  cfopExterior?: string;
  geraDuplicata: boolean;
  movimentaEstoque: boolean;
  calculaIcms: boolean;
  calculaIpi: boolean;
  calculaPisCofins: boolean;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CFOP {
  id: string;
  codigo: string;
  descricao: string;
  aplicacao?: string;
  destino: 'interno' | 'interestadual' | 'exterior';
  tipo: 'entrada' | 'saida';
  categoria?: string;
  ativo: boolean;
  createdAt: string;
}

export interface Tributo {
  id: string;
  descricao: string;
  tipo: 'ICMS' | 'IPI' | 'PIS' | 'COFINS' | 'ISS' | 'CSLL' | 'IRPJ';
  subtipo?: 'normal' | 'substituicao' | 'diferido' | 'isento';
  aliquota: number;
  baseCalculo: number;
  uf?: string;
  regimeTributario?: string;
  ncmInicio?: string;
  ncmFim?: string;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NCM {
  id: string;
  codigo: string;
  descricao: string;
  unidade?: string;
  aliquotaIpi: number;
  categoria?: string;
  observacoes?: string;
  ativo: boolean;
  createdAt: string;
}

export const REGIMES_TRIBUTARIOS = [
  'SIMPLES_NACIONAL',
  'LUCRO_PRESUMIDO',
  'LUCRO_REAL',
  'MEI',
] as const;

export const TIPOS_OPERACAO = [
  'venda',
  'compra',
  'remessa',
  'devolucao',
  'transferencia'
] as const;

export const TIPOS_TRIBUTO = [
  'ICMS',
  'IPI',
  'PIS',
  'COFINS',
  'ISS',
  'CSLL',
  'IRPJ'
] as const;
