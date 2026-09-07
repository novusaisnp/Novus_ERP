// Tipos compartilhados para exportação de relatórios (P4.1)
import type { AggregatedRow } from './relatoriosAgg';

export interface ReportKpi {
  label: string;
  value: string;
  delta?: string | null;
}

export interface ReportFilterInfo {
  label: string;
  value: string;
}

export interface ReportDetailColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
  /** 'right' formata o valor numérico com separador de milhar (pt-BR, sem
   * cifrão) e alinha a coluna à direita no PDF/Excel. Omitido = texto comum,
   * alinhado à esquerda (comportamento anterior, preservado). */
  align?: 'left' | 'right';
}

export interface ReportInsightLine {
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  description?: string;
}

export interface ReportBranding {
  companyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
}

export interface ReportExportPayload<TDetail> {
  title: string;
  subtitle?: string;
  branding?: ReportBranding | null;
  filters: ReportFilterInfo[];
  kpis: ReportKpi[];
  insights: ReportInsightLine[];
  detail: {
    columns: ReportDetailColumn<TDetail>[];
    rows: TDetail[];
  };
  aggregated?: {
    groupLabel: string;
    rows: AggregatedRow[];
  } | null;
  filenameBase: string;
}

export const brlPt = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

// Separador de milhar pt-BR sem símbolo de moeda (ex.: 54.025,00) — pedido
// explícito pra colunas de valor em relatórios que não são estritamente
// "dinheiro" (saldo contábil, quantidade, etc.), mas ainda precisam de
// pontuação de milhares/milhões pra leitura.
export const numberPt = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

export const percentPt = (v: number): string =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0) + '%';

export const timestampSuffix = (): string => new Date().toISOString().slice(0, 10);
