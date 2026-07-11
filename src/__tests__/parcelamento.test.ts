import { describe, it, expect } from 'vitest';
import { gerarParcelas, somaParcelas } from '@/utils/parcelamento';

describe('gerarParcelas — FIN-E3', () => {
  it('soma sempre igual ao valor líquido (sem entrada)', () => {
    const p = gerarParcelas({ valorLiquido: 100, qtdParcelas: 3, dataVenda: '2026-01-01' });
    expect(p).toHaveLength(3);
    expect(somaParcelas(p)).toBeCloseTo(100, 2);
  });

  it('soma exata com centavo residual (10/3)', () => {
    const p = gerarParcelas({ valorLiquido: 10, qtdParcelas: 3, dataVenda: '2026-01-01' });
    expect(somaParcelas(p)).toBeCloseTo(10, 2);
    // residual na última
    expect(p[2].valor).toBeGreaterThanOrEqual(p[0].valor);
  });

  it('entrada em D+0 marca is_entrada e datas seguem monotônicas', () => {
    const p = gerarParcelas({
      valorLiquido: 300,
      qtdParcelas: 3,
      percentualEntrada: 10,
      dataVenda: '2026-01-01',
      diasPrimeiraParcela: 30,
      intervaloDias: 30,
    });
    expect(p[0].is_entrada).toBe(true);
    expect(p[0].data_vencimento).toBe('2026-01-01');
    expect(somaParcelas(p)).toBeCloseTo(300, 2);
    for (let i = 1; i < p.length; i++) {
      expect(p[i].data_vencimento >= p[i - 1].data_vencimento).toBe(true);
    }
  });

  it('1 parcela retorna 1 registro com valor total', () => {
    const p = gerarParcelas({ valorLiquido: 55.55, qtdParcelas: 1, dataVenda: '2026-06-15' });
    expect(p).toHaveLength(1);
    expect(p[0].valor).toBeCloseTo(55.55, 2);
  });
});
