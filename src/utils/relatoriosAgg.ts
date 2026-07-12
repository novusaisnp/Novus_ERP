// Utilitários puros para agregação de relatórios (P2)
// Timezone padrão: America/Sao_Paulo. Semana ISO iniciando segunda-feira.

export const TZ = 'America/Sao_Paulo';
export const NAO_INFORMADO = 'Não informado';

export type VendasGroupBy = 'nenhum' | 'dia' | 'semana' | 'mes' | 'status' | 'cliente';
export type FinanceiroGroupBy = 'nenhum' | 'tipo' | 'situacao' | 'faixa_vencimento';

export type FaixaVencimento = 'vencido' | '0-7d' | '8-30d' | '31-60d' | '60+d' | 'sem_data';

export interface AggregatedRow {
  key: string;
  label: string;
  quantidade: number;
  valor_total: number;
  percentual: number;
}

/**
 * Converte data ISO (YYYY-MM-DD ou ISO completa) em componentes Y/M/D
 * no timezone America/Sao_Paulo. Aceita null/undefined → null.
 */
export function toSaoPauloParts(iso?: string | null): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  // Trata datas puras "YYYY-MM-DD" como locais (sem shift de fuso)
  const pureMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (pureMatch) {
    return { y: +pureMatch[1], m: +pureMatch[2], d: +pureMatch[3] };
  }
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(dt);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function bucketDia(iso?: string | null): string {
  const p = toSaoPauloParts(iso);
  if (!p) return NAO_INFORMADO;
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

export function bucketMes(iso?: string | null): string {
  const p = toSaoPauloParts(iso);
  if (!p) return NAO_INFORMADO;
  return `${p.y}-${String(p.m).padStart(2, '0')}`;
}

/**
 * Semana ISO 8601 (segunda-feira como início). Retorna "YYYY-Www".
 */
export function bucketSemana(iso?: string | null): string {
  const p = toSaoPauloParts(iso);
  if (!p) return NAO_INFORMADO;
  // Cálculo ISO week em UTC para evitar DST
  const date = new Date(Date.UTC(p.y, p.m - 1, p.d));
  const dayNum = date.getUTCDay() || 7; // domingo=0 → 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function bucketPeriodo(iso: string | null | undefined, granularidade: 'dia' | 'semana' | 'mes'): string {
  if (granularidade === 'dia') return bucketDia(iso);
  if (granularidade === 'semana') return bucketSemana(iso);
  return bucketMes(iso);
}

/**
 * Diferença em dias entre duas datas no fuso America/Sao_Paulo.
 * Positivo = alvo no futuro. Base default = hoje.
 */
export function diasAte(alvoIso: string, baseIso?: string): number {
  const alvo = toSaoPauloParts(alvoIso);
  const base = toSaoPauloParts(baseIso ?? new Date().toISOString());
  if (!alvo || !base) return 0;
  const a = Date.UTC(alvo.y, alvo.m - 1, alvo.d);
  const b = Date.UTC(base.y, base.m - 1, base.d);
  return Math.round((a - b) / 86400000);
}

/**
 * Classifica em faixa de vencimento. Se já foi liquidada (pago/recebido/cancelado)
 * não conta como vencida — usa a diferença bruta.
 */
export function bucketVencimento(
  dataVencimento: string | null | undefined,
  hojeIso?: string,
  situacao?: string | null,
): FaixaVencimento {
  if (!dataVencimento) return 'sem_data';
  const liquidada = ['PAGA', 'PAGO', 'RECEBIDO', 'RECEBIDA', 'CANCELADA', 'CANCELADO'].includes(
    (situacao ?? '').toUpperCase(),
  );
  const diff = diasAte(dataVencimento, hojeIso);
  if (!liquidada && diff < 0) return 'vencido';
  if (diff <= 7) return '0-7d';
  if (diff <= 30) return '8-30d';
  if (diff <= 60) return '31-60d';
  return '60+d';
}

export const FAIXA_LABEL: Record<FaixaVencimento, string> = {
  vencido: 'Vencido',
  '0-7d': '0-7 dias',
  '8-30d': '8-30 dias',
  '31-60d': '31-60 dias',
  '60+d': '60+ dias',
  sem_data: 'Sem data',
};

/**
 * Agrupa rows por keyFn/valueFn, retorna linhas com percentual sobre o total.
 * Ordena por valor_total desc.
 */
export function groupBy<T>(
  rows: T[],
  keyFn: (row: T) => string,
  valueFn: (row: T) => number,
  labelFn?: (key: string) => string,
): AggregatedRow[] {
  const map = new Map<string, { qtd: number; total: number }>();
  for (const r of rows) {
    const k = keyFn(r) || NAO_INFORMADO;
    const v = Number(valueFn(r)) || 0;
    const cur = map.get(k) ?? { qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += v;
    map.set(k, cur);
  }
  const totalGeral = Array.from(map.values()).reduce((acc, v) => acc + v.total, 0);
  const out: AggregatedRow[] = Array.from(map.entries()).map(([key, v]) => ({
    key,
    label: labelFn ? labelFn(key) : key,
    quantidade: v.qtd,
    valor_total: v.total,
    percentual: totalGeral > 0 ? (v.total / totalGeral) * 100 : 0,
  }));
  out.sort((a, b) => b.valor_total - a.valor_total);
  return out;
}

export function normalizeStatus(s?: string | null): string {
  const t = (s ?? '').trim();
  return t.length > 0 ? t : NAO_INFORMADO;
}
