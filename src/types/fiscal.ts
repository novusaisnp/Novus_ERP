
export interface ConfiguracaoFiscal {
  id: string;
  empresaRepresentadaId: string;
  ambiente: 'Teste' | 'Producao';
  certificadoDigital?: string;
  senhaCertificado?: string;
  regimeTributario: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real';
  aliquotaIcmsPadrao: number;
  aliquotaIpiPadrao: number;
  aliquotaPisPadrao: number;
  aliquotaCofinsPadrao: number;
  aliquotaIssPadrao: number;
  serieNfe: string;
  numeroUltimoNfe: number;
  serieNfce: string;
  numeroUltimoNfce: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
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
  'Simples Nacional',
  'Lucro Presumido',
  'Lucro Real'
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
