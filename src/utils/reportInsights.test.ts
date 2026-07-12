import { describe, it, expect } from 'vitest';
import {
  computeVendasInsights,
  computeFinanceiroInsights,
  INSIGHT_THRESHOLDS,
} from './reportInsights';
import { calcDelta, periodoAnteriorEquivalente } from './reportComparison';

describe('reportComparison', () => {
  it('calcula janela anterior equivalente inclusive', () => {
    const r = periodoAnteriorEquivalente('2025-01-08', '2025-01-14');
    expect(r).not.toBeNull();
    expect(r?.durationDays).toBe(7);
    expect(r?.anterior.inicio).toBe('2025-01-01');
    expect(r?.anterior.fim).toBe('2025-01-07');
  });

  it('rejeita quando inicio > fim ou datas invalidas', () => {
    expect(periodoAnteriorEquivalente('2025-01-10', '2025-01-01')).toBeNull();
    expect(periodoAnteriorEquivalente('invalid', '2025-01-01')).toBeNull();
  });

  it('delta: anterior=0 e atual>0 -> new/null%', () => {
    const d = calcDelta(100, 0);
    expect(d.status).toBe('new');
    expect(d.percentual).toBeNull();
  });

  it('delta: anterior=0 e atual=0 -> flat/0%', () => {
    const d = calcDelta(0, 0);
    expect(d.status).toBe('flat');
    expect(d.percentual).toBe(0);
  });

  it('delta: calculo percentual correto', () => {
    const d = calcDelta(120, 100);
    expect(d.percentual).toBeCloseTo(20, 5);
    expect(d.status).toBe('up');
  });
});

describe('computeVendasInsights', () => {
  it('gera critical quando queda >= quedaCrit', () => {
    const delta = calcDelta(30, 100); // -70%
    const out = computeVendasInsights({ faturamentoAtual: 30, faturamentoDelta: delta });
    expect(out[0].severity).toBe('critical');
  });

  it('gera warning quando queda entre warn e crit', () => {
    const delta = calcDelta(75, 100); // -25%
    const out = computeVendasInsights({ faturamentoAtual: 75, faturamentoDelta: delta });
    expect(out[0].severity).toBe('warning');
  });

  it('nao gera quando queda menor que warn', () => {
    const delta = calcDelta(95, 100); // -5%
    const out = computeVendasInsights({ faturamentoAtual: 95, faturamentoDelta: delta });
    expect(out).toHaveLength(0);
  });

  it('detecta concentracao de cliente acima do threshold', () => {
    const out = computeVendasInsights({
      faturamentoAtual: 1000,
      clientesAgrupados: [
        { key: 'Acme', label: 'Acme', quantidade: 5, valor_total: 500, percentual: 50 },
        { key: 'Beta', label: 'Beta', quantidade: 2, valor_total: 200, percentual: 20 },
      ],
    });
    expect(out.some((i) => i.id.startsWith('vendas-concentracao'))).toBe(true);
  });
});

describe('computeFinanceiroInsights', () => {
  it('gera critical quando vencidos sobem acima de altaVencidosCrit', () => {
    const delta = calcDelta(200, 100); // +100%
    const out = computeFinanceiroInsights({
      vencidosAtual: 200,
      vencidosDelta: delta,
      totalAberto: 1000,
    });
    expect(out.some((i) => i.severity === 'critical')).toBe(true);
  });

  it('gera warning por participacao alta de vencidos', () => {
    const out = computeFinanceiroInsights({
      vencidosAtual: 400,
      totalAberto: 1000,
      vencidosDelta: null,
    });
    expect(out.some((i) => i.id === 'fin-participacao-vencido')).toBe(true);
  });

  it('respeita thresholds exportados', () => {
    expect(INSIGHT_THRESHOLDS.financeiro.participacaoVencido).toBe(30);
  });
});
