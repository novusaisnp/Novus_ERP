// P5.1 — Hook de leitura para KPIs e falhas 24h do módulo de agendamentos.
import { useQuery } from "@tanstack/react-query";
import {
  fetchReportRunFailures24h,
  fetchReportRunKpis24h,
  fetchReportRuns,
  type ReportRunFailureRow,
  type ReportRunKpiRow,
  type ReportRunListItem,
  type RunsFilter,
} from "@/services/reportRunOpsService";

const STALE_MS = 30_000;

export function useReportRunKpis24h() {
  return useQuery<ReportRunKpiRow[]>({
    queryKey: ["report-run-kpis-24h"],
    queryFn: fetchReportRunKpis24h,
    staleTime: STALE_MS,
    refetchInterval: 60_000,
  });
}

export function useReportRunFailures24h() {
  return useQuery<ReportRunFailureRow[]>({
    queryKey: ["report-run-failures-24h"],
    queryFn: fetchReportRunFailures24h,
    staleTime: STALE_MS,
    refetchInterval: 60_000,
  });
}

export function useReportRuns(filter: RunsFilter) {
  return useQuery<ReportRunListItem[]>({
    queryKey: [
      "report-runs",
      filter.hours ?? 24,
      filter.scope ?? null,
      filter.format ?? null,
      filter.status ?? null,
      filter.reason ?? null,
      filter.scheduleId ?? null,
      filter.limit ?? 200,
    ],
    queryFn: () => fetchReportRuns(filter),
    staleTime: STALE_MS,
  });
}
