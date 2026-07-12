import { describe, it, expect } from 'vitest';
import {
  bucketDia,
  bucketMes,
  bucketSemana,
  bucketPeriodo,
  bucketVencimento,
  groupBy,
  diasAte,
  normalizeStatus,
} from './relatoriosAgg';

describe('relatoriosAgg — bucketPeriodo', () => {
  it('dia formata YYYY-MM-DD', () => {
    expect(bucketDia('2025-03-15')).toBe('2025-03-15');
    expect(bucketPeriodo('2025-03-15', 'dia')).toBe('2025-03-15');
  });
  it('mes formata YYYY-MM', () => {
    expect(bucketMes('2025-03-15')).toBe('2025-03-15'.slice(0, 7));
    expect(bucketPeriodo('2025-03-15', 'mes')).toBe('2025-03');
  });
  it('semana ISO segunda-feira', () => {
    // 2025-01-06 (segunda) = semana 02 de 2025
    expect(bucketSemana('2025-01-06')).toBe('2025-W02');
    // 2024-12-30 (segunda) pertence à semana 01 de 2025
    expect(bucketSemana('2024-12-30')).toBe('2025-W01');
  });
  it('trata data inválida como Não informado', () => {
    expect(bucketDia(null)).toBe('Não informado');
    expect(bucketMes(undefined)).toBe('Não informado');
    expect(bucketSemana('')).toBe('Não informado');
  });
});

describe('relatoriosAgg — bucketVencimento', () => {
  const hoje = '2025-06-15';
  it('classifica vencido quando anterior a hoje e não liquidada', () => {
    expect(bucketVencimento('2025-06-14', hoje, 'ABERTA')).toBe('vencido');
  });
  it('não marca vencido se liquidada', () => {
    expect(bucketVencimento('2025-06-14', hoje, 'PAGA')).not.toBe('vencido');
  });
  it('fronteira 0-7d inclui hoje e +7', () => {
    expect(bucketVencimento('2025-06-15', hoje, 'ABERTA')).toBe('0-7d');
    expect(bucketVencimento('2025-06-22', hoje, 'ABERTA')).toBe('0-7d');
  });
  it('fronteira 8-30d', () => {
    expect(bucketVencimento('2025-06-23', hoje, 'ABERTA')).toBe('8-30d');
    expect(bucketVencimento('2025-07-15', hoje, 'ABERTA')).toBe('8-30d');
  });
  it('fronteira 31-60d', () => {
    expect(bucketVencimento('2025-07-16', hoje, 'ABERTA')).toBe('31-60d');
    expect(bucketVencimento('2025-08-14', hoje, 'ABERTA')).toBe('31-60d');
  });
  it('faixa 60+d', () => {
    expect(bucketVencimento('2025-08-15', hoje, 'ABERTA')).toBe('60+d');
    expect(bucketVencimento('2026-01-01', hoje, 'ABERTA')).toBe('60+d');
  });
  it('sem_data quando ausente', () => {
    expect(bucketVencimento(null, hoje)).toBe('sem_data');
    expect(bucketVencimento(undefined, hoje)).toBe('sem_data');
  });
});

describe('relatoriosAgg — groupBy', () => {
  const rows = [
    { g: 'A', v: 100 },
    { g: 'A', v: 50 },
    { g: 'B', v: 150 },
    { g: '', v: 25 },
  ];
  it('agrega quantidade e valor total', () => {
    const out = groupBy(rows, (r) => r.g, (r) => r.v);
    const a = out.find((o) => o.key === 'A')!;
    const b = out.find((o) => o.key === 'B')!;
    expect(a.quantidade).toBe(2);
    expect(a.valor_total).toBe(150);
    expect(b.valor_total).toBe(150);
  });
  it('percentual soma ~100', () => {
    const out = groupBy(rows, (r) => r.g, (r) => r.v);
    const soma = out.reduce((acc, o) => acc + o.percentual, 0);
    expect(Math.round(soma)).toBe(100);
  });
  it('chave vazia vira Não informado', () => {
    const out = groupBy(rows, (r) => r.g, (r) => r.v);
    expect(out.some((o) => o.key === 'Não informado')).toBe(true);
  });
  it('ordena por valor_total desc', () => {
    const out = groupBy(rows, (r) => r.g, (r) => r.v);
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].valor_total).toBeGreaterThanOrEqual(out[i].valor_total);
    }
  });
});

describe('relatoriosAgg — auxiliares', () => {
  it('diasAte positivo/negativo', () => {
    expect(diasAte('2025-06-20', '2025-06-15')).toBe(5);
    expect(diasAte('2025-06-10', '2025-06-15')).toBe(-5);
  });
  it('normalizeStatus vazio → Não informado', () => {
    expect(normalizeStatus(null)).toBe('Não informado');
    expect(normalizeStatus('  ')).toBe('Não informado');
    expect(normalizeStatus('ABERTA')).toBe('ABERTA');
  });
});
