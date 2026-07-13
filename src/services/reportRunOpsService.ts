// P5.1 — Serviço leitura de operação (admin) sobre report_schedule_runs e views 24h.
// Sem writes; sem exposição de dados sensíveis. Gate admin é aplicado na página.
import { supabase } from "@/integrations/supabase/client";

export interface ReportRunKpiRow {
  scope: string;
  format: string;
  total_runs: number;
  succeeded: number;
  failed: number;
  running: number;
  success_rate_pct: number | null;
  p95_duration_ms: number | null;
  avg_duration_ms: number | null;
}

export interface ReportRunFailureRow {
  reason: string;
  scope: string;
  format: string;
  failures: number;
  last_seen_at: string;
}

export interface ReportRunListItem {
  id: string;
  schedule_id: string;
  status: "running" | "succeeded" | "failed";
  attempt: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface RunsFilter {
  hours?: number;           // janela (default 24)
  scope?: string | null;
  format?: string | null;
  status?: "running" | "succeeded" | "failed" | null;
  reason?: string | null;   // prefixo antes de ':'
  scheduleId?: string | null;
  limit?: number;
}

const anyClient = supabase as unknown as {
  from: (name: string) => {
    select: (cols: string) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
};

export async function fetchReportRunKpis24h(): Promise<ReportRunKpiRow[]> {
  const { data, error } = await anyClient
    .from("v_report_run_kpis_24h")
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRunKpiRow[];
}

export async function fetchReportRunFailures24h(): Promise<ReportRunFailureRow[]> {
  const { data, error } = await anyClient
    .from("v_report_run_failures_by_reason_24h")
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRunFailureRow[];
}

export async function fetchReportRuns(filter: RunsFilter = {}): Promise<ReportRunListItem[]> {
  const hours = Math.max(1, filter.hours ?? 24);
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let q = supabase
    .from("report_schedule_runs")
    .select("id,schedule_id,status,attempt,started_at,finished_at,error_message,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 200);

  if (filter.status) q = q.eq("status", filter.status);
  if (filter.scheduleId) q = q.eq("schedule_id", filter.scheduleId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? []) as ReportRunListItem[];

  if (filter.reason) {
    rows = rows.filter((r) => {
      const prefix = (r.error_message ?? "").split(":")[0].trim();
      return prefix === filter.reason;
    });
  }
  return rows;
}
