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

  // Dinheiro é `number` em todo o TypeScript. Em vez de migrar a base inteira para centavos
  // inteiros, esta varredura prova a propriedade que realmente importa: nenhum centavo se
  // perde nem se inventa ao dividir. Se algum dia deixar de valer, quebra aqui.
  it('nenhum centavo se perde ao dividir, em qualquer combinação', () => {
    const valores = [0.01, 0.03, 1, 9.99, 10, 33.33, 100, 100.01, 1234.56, 99999.99];
    const quantidades = [1, 2, 3, 4, 6, 7, 11, 12, 13];

    for (const valorLiquido of valores) {
      for (const qtdParcelas of quantidades) {
        const parcelas = gerarParcelas({ valorLiquido, qtdParcelas, dataVenda: '2026-01-01' });

        expect(parcelas).toHaveLength(qtdParcelas);

        // Comparar em centavos inteiros: igualdade exata, sem tolerância que esconda erro.
        const somaCentavos = parcelas.reduce((acc, p) => acc + Math.round(p.valor * 100), 0);
        expect(somaCentavos).toBe(Math.round(valorLiquido * 100));

        // Nenhuma parcela negativa, mesmo quando o valor não divide de forma exata.
        expect(parcelas.every((p) => p.valor >= 0)).toBe(true);
      }
    }
  });

  it('nenhum centavo se perde quando há entrada', () => {
    for (const percentualEntrada of [10, 20, 33.33, 50]) {
      for (const valorLiquido of [10, 99.99, 1234.56]) {
        const parcelas = gerarParcelas({
          valorLiquido,
          qtdParcelas: 6,
          percentualEntrada,
          dataVenda: '2026-01-01',
        });

        const somaCentavos = parcelas.reduce((acc, p) => acc + Math.round(p.valor * 100), 0);
        expect(somaCentavos).toBe(Math.round(valorLiquido * 100));
      }
    }
  });
});
