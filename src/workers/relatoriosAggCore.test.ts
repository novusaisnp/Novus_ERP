import { describe, it, expect } from 'vitest';
import { aggregatePairs, type AggPair } from '@/workers/relatoriosAggCore';

describe('aggregatePairs', () => {
  it('agrupa por chave, soma valores e calcula percentual', () => {
    const pairs: AggPair[] = [
      { key: 'a', label: 'A', value: 100 },
      { key: 'a', label: 'A', value: 50 },
      { key: 'b', label: 'B', value: 50 },
    ];
    const rows = aggregatePairs(pairs);
    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe('a');
    expect(rows[0].valor_total).toBe(150);
    expect(rows[0].quantidade).toBe(2);
    expect(Math.round(rows[0].percentual)).toBe(75);
    expect(rows[1].key).toBe('b');
    expect(rows[1].valor_total).toBe(50);
  });

  it('ordena por valor_total desc', () => {
    const pairs: AggPair[] = [
      { key: 'x', label: 'X', value: 10 },
      { key: 'y', label: 'Y', value: 100 },
      { key: 'z', label: 'Z', value: 50 },
    ];
    const rows = aggregatePairs(pairs);
    expect(rows.map((r) => r.key)).toEqual(['y', 'z', 'x']);
  });

  it('lida com lista vazia sem crash', () => {
    expect(aggregatePairs([])).toEqual([]);
  });

  it('trata valor não numérico como zero', () => {
    const pairs: AggPair[] = [
      { key: 'a', label: 'A', value: NaN },
      { key: 'a', label: 'A', value: 10 },
    ];
    const rows = aggregatePairs(pairs);
    expect(rows[0].valor_total).toBe(10);
    expect(rows[0].quantidade).toBe(2);
  });

  it('consistência com dataset grande (5000 linhas)', () => {
    const pairs: AggPair[] = Array.from({ length: 5000 }, (_, i) => ({
      key: i % 5 === 0 ? 'g1' : 'g2',
      label: i % 5 === 0 ? 'G1' : 'G2',
      value: 1,
    }));
    const rows = aggregatePairs(pairs);
    expect(rows).toHaveLength(2);
    const total = rows.reduce((acc, r) => acc + r.valor_total, 0);
    expect(total).toBe(5000);
  });
});
