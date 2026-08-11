// P5.1 — Cards KPI de operação de relatórios agendados (últimas 24h).
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportRunKpiRow } from "@/services/reportRunOpsService";

interface Props {
  data: ReportRunKpiRow[] | undefined;
  isLoading: boolean;
}

interface Aggregated {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  successRate: number | null;
  p95Ms: number | null;
}

function aggregate(rows: ReportRunKpiRow[]): Aggregated {
  const total = rows.reduce((acc, r) => acc + Number(r.total_runs ?? 0), 0);
  const succeeded = rows.reduce((acc, r) => acc + Number(r.succeeded ?? 0), 0);
  const failed = rows.reduce((acc, r) => acc + Number(r.failed ?? 0), 0);
  const running = rows.reduce((acc, r) => acc + Number(r.running ?? 0), 0);
  const decisionable = succeeded + failed;
  const successRate = decisionable > 0 ? (100 * succeeded) / decisionable : null;
  const p95Values = rows
    .map((r) => (r.p95_duration_ms == null ? null : Number(r.p95_duration_ms)))
    .filter((v): v is number => Number.isFinite(v));
  const p95Ms = p95Values.length > 0 ? Math.max(...p95Values) : null;
  return { total, succeeded, failed, running, successRate, p95Ms };
}

const KpiCard: React.FC<{ title: string; value: string; hint?: string }> = ({ title, value, hint }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-semibold font-tabular">{value}</div>
      {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
    </CardContent>
  </Card>
);

export const KpiCards: React.FC<Props> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const agg = aggregate(data);
  const successRateStr = agg.successRate == null ? "—" : `${agg.successRate.toFixed(1)}%`;
  const p95Str = agg.p95Ms == null ? "—" : `${(agg.p95Ms / 1000).toFixed(2)} s`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard title="Taxa de sucesso (24h)" value={successRateStr} hint={`${agg.succeeded}/${agg.succeeded + agg.failed} concluídos`} />
      <KpiCard title="Duração p95 (24h)" value={p95Str} hint="pior p95 por scope/format" />
      <KpiCard title="Falhas (24h)" value={String(agg.failed)} hint={`de ${agg.total} runs`} />
      <KpiCard title="Em execução" value={String(agg.running)} hint="status = running" />
    </div>
  );
};
