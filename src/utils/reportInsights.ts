/**
 * Regras client-side de insights/alertas para relatórios.
 * Fonte única: baseFiltered da tela + delta opcional do período comparado.
 */

import type { AggregatedRow, FaixaVencimento } from './relatoriosAgg';
import type { Delta } from './reportComparison';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  impact: number; // valor absoluto de referência p/ ordenação
  action?: {
    label: string;
    payload: InsightActionPayload;
  };
}

export type InsightActionPayload =
  | { kind: 'drill'; type: string; key: string; label: string }
  | { kind: 'noop' };

export const INSIGHT_THRESHOLDS = {
  vendas: {
    quedaWarn: -20,
    quedaCrit: -40,
    concentracaoCliente: 40,
  },
  financeiro: {
    altaVencidosWarn: 25,
    altaVencidosCrit: 50,
    participacaoVencido: 30,
  },
} as const;

const SEVERITY_RANK: Record<InsightSeverity, number> = { critical: 3, warning: 2, info: 1 };

function sortInsights(insights: Insight[]): Insight[] {
  return insights.slice().sort((a, b) => {
    const sr = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (sr !== 0) return sr;
    return b.impact - a.impact;
  });
}

export interface VendasInsightInput {
  faturamentoAtual: number;
  faturamentoDelta?: Delta | null;
  clientesAgrupados?: AggregatedRow[]; // groupBy cliente
}

export function computeVendasInsights(input: VendasInsightInput): Insight[] {
  const out: Insight[] = [];
  const t = INSIGHT_THRESHOLDS.vendas;

  if (input.faturamentoDelta && input.faturamentoDelta.percentual !== null) {
    const p = input.faturamentoDelta.percentual;
    if (p <= t.quedaCrit) {
      out.push({
        id: 'vendas-queda-crit',
        severity: 'critical',
        title: `Queda crítica de faturamento (${p.toFixed(1)}%)`,
        description: `Faturamento caiu ${Math.abs(p).toFixed(1)}% vs período anterior.`,
        impact: Math.abs(input.faturamentoDelta.absoluto),
      });
    } else if (p <= t.quedaWarn) {
      out.push({
        id: 'vendas-queda-warn',
        severity: 'warning',
        title: `Queda de faturamento (${p.toFixed(1)}%)`,
        description: `Faturamento caiu ${Math.abs(p).toFixed(1)}% vs período anterior.`,
        impact: Math.abs(input.faturamentoDelta.absoluto),
      });
    }
  }

  if (input.clientesAgrupados && input.clientesAgrupados.length > 0) {
    const top = input.clientesAgrupados[0];
    if (top.percentual >= t.concentracaoCliente) {
      out.push({
        id: `vendas-concentracao-${top.key}`,
        severity: 'info',
        title: `Concentração em ${top.label}`,
        description: `${top.label} representa ${top.percentual.toFixed(1)}% do faturamento.`,
        impact: top.valor_total,
        action: {
          label: `Ver ${top.label}`,
          payload: { kind: 'drill', type: 'cliente', key: top.key, label: top.label },
        },
      });
    }
  }

  return sortInsights(out);
}

export interface FinanceiroInsightInput {
  vencidosAtual: number;
  vencidosDelta?: Delta | null;
  totalAberto: number;
  faixasAgrupadas?: AggregatedRow[]; // groupBy faixa_vencimento
}

export function computeFinanceiroInsights(input: FinanceiroInsightInput): Insight[] {
  const out: Insight[] = [];
  const t = INSIGHT_THRESHOLDS.financeiro;

  if (input.vencidosDelta && input.vencidosDelta.percentual !== null) {
    const p = input.vencidosDelta.percentual;
    if (p >= t.altaVencidosCrit) {
      out.push({
        id: 'fin-vencidos-crit',
        severity: 'critical',
        title: `Vencidos subiram ${p.toFixed(1)}%`,
        description: `Valor em atraso cresceu ${p.toFixed(1)}% vs período anterior.`,
        impact: Math.abs(input.vencidosDelta.absoluto),
      });
    } else if (p >= t.altaVencidosWarn) {
      out.push({
        id: 'fin-vencidos-warn',
        severity: 'warning',
        title: `Vencidos subiram ${p.toFixed(1)}%`,
        description: `Valor em atraso cresceu ${p.toFixed(1)}% vs período anterior.`,
        impact: Math.abs(input.vencidosDelta.absoluto),
      });
    }
  }

  if (input.totalAberto > 0 && input.vencidosAtual > 0) {
    const part = (input.vencidosAtual / input.totalAberto) * 100;
    if (part >= t.participacaoVencido) {
      const faixaKey: FaixaVencimento = 'vencido';
      out.push({
        id: 'fin-participacao-vencido',
        severity: 'warning',
        title: `Vencidos representam ${part.toFixed(1)}% do total`,
        description: `Concentração acima de ${t.participacaoVencido}% do total em aberto.`,
        impact: input.vencidosAtual,
        action: {
          label: 'Ver vencidos',
          payload: { kind: 'drill', type: 'faixa_vencimento', key: faixaKey, label: 'Vencido' },
        },
      });
    }
  }

  return sortInsights(out);
}
