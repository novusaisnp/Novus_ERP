// Núcleo puro de agregação (P4.3). Usado inline e dentro do worker.
// Recebe pares (key,label,value) já preparados pela thread principal
// (a função keyFn não pode atravessar o postMessage).

import type { AggregatedRow } from '@/utils/relatoriosAgg';

export interface AggPair {
  key: string;
  label: string;
  value: number;
}

export function aggregatePairs(pairs: AggPair[]): AggregatedRow[] {
  const map = new Map<string, { label: string; qtd: number; total: number }>();
  for (const p of pairs) {
    const cur = map.get(p.key) ?? { label: p.label, qtd: 0, total: 0 };
    cur.qtd += 1;
    cur.total += Number(p.value) || 0;
    map.set(p.key, cur);
  }
  const totalGeral = Array.from(map.values()).reduce((acc, v) => acc + v.total, 0);
  const out: AggregatedRow[] = Array.from(map.entries()).map(([key, v]) => ({
    key,
    label: v.label,
    quantidade: v.qtd,
    valor_total: v.total,
    percentual: totalGeral > 0 ? (v.total / totalGeral) * 100 : 0,
  }));
  out.sort((a, b) => b.valor_total - a.valor_total);
  return out;
}

// Protocolo tipado de mensagens
export interface AggRequest {
  id: string;
  pairs: AggPair[];
}
export interface AggResponse {
  id: string;
  rows: AggregatedRow[];
  elapsedMs: number;
}
