/**
 * Cálculo de janela de período anterior equivalente e deltas.
 * Aritmética em UTC ms para evitar DST. Labels formatadas em America/Sao_Paulo.
 */

const MS_DAY = 86_400_000;

export interface PeriodoRange {
  inicio: string; // YYYY-MM-DD
  fim: string; // YYYY-MM-DD
}

export interface PeriodoComparado {
  atual: PeriodoRange;
  anterior: PeriodoRange;
  durationDays: number;
}

export type DeltaStatus = 'up' | 'down' | 'flat' | 'new' | 'na';

export interface Delta {
  atual: number;
  anterior: number;
  absoluto: number;
  percentual: number | null; // null quando anterior=0 e atual>0
  status: DeltaStatus;
}

function parseYmd(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  return Number.isNaN(t) ? null : t;
}

function toYmd(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/**
 * Retorna janela anterior de mesma duração (inclusive).
 * Requer início E fim válidos e início <= fim.
 */
export function periodoAnteriorEquivalente(inicio: string, fim: string): PeriodoComparado | null {
  const a = parseYmd(inicio);
  const b = parseYmd(fim);
  if (a === null || b === null || a > b) return null;
  const durationDays = Math.round((b - a) / MS_DAY) + 1;
  const anteriorFim = a - MS_DAY;
  const anteriorInicio = anteriorFim - (durationDays - 1) * MS_DAY;
  return {
    atual: { inicio, fim },
    anterior: { inicio: toYmd(anteriorInicio), fim: toYmd(anteriorFim) },
    durationDays,
  };
}

/**
 * Calcula delta entre dois valores. Regras:
 * - anterior=0 e atual=0 -> flat, 0%
 * - anterior=0 e atual>0 -> new, percentual null
 * - anterior>0 -> percentual = (atual-anterior)/anterior*100
 * Status: up se > +0.5%, down se < -0.5%, flat caso contrário.
 */
export function calcDelta(atual: number, anterior: number): Delta {
  const a = Number.isFinite(atual) ? atual : 0;
  const p = Number.isFinite(anterior) ? anterior : 0;
  const absoluto = a - p;
  if (p === 0) {
    if (a === 0) return { atual: a, anterior: p, absoluto: 0, percentual: 0, status: 'flat' };
    return { atual: a, anterior: p, absoluto, percentual: null, status: 'new' };
  }
  const percentual = (absoluto / p) * 100;
  let status: DeltaStatus = 'flat';
  if (percentual > 0.5) status = 'up';
  else if (percentual < -0.5) status = 'down';
  return { atual: a, anterior: p, absoluto, percentual, status };
}

const TZ = 'America/Sao_Paulo';

export function formatRangeLabel(range: PeriodoRange): string {
  const fmt = (iso: string) => {
    const t = parseYmd(iso);
    if (t === null) return iso;
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(t));
  };
  return `${fmt(range.inicio)} — ${fmt(range.fim)}`;
}

export function formatPercent(v: number | null): string {
  if (v === null) return 'Novo';
  if (!Number.isFinite(v)) return 'N/A';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}%`;
}
