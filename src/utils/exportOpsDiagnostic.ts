// P6.4 — Export CSV client-side de diagnóstico operacional.
// Whitelist explícita de colunas — proibido incluir signed_url/recipients/view_state/tokens.
import type { ReportRunFailureRow, ReportRunKpiRow } from "@/services/reportRunOpsService";
import type { OpsAlertRow } from "@/services/opsAlertsService";

const BOM = "\uFEFF";

/** CSV-safe escape: aspas duplas duplicadas, envolve em aspas se contém , " ou \n */
export function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToCsv(cols: (string | number | null | undefined)[]): string {
  return cols.map(csvEscape).join(",");
}

function section(title: string): string {
  return `# ${title}`;
}

export interface DiagnosticInput {
  kpis: ReportRunKpiRow[];
  failures: ReportRunFailureRow[];
  openAlerts: OpsAlertRow[];
}

// Whitelist rígida — NUNCA incluir signed_url, recipients, view_state, tokens.
const KPI_COLS = [
  "scope",
  "format",
  "total_runs",
  "succeeded",
  "failed",
  "running",
  "success_rate_pct",
  "p95_duration_ms",
  "avg_duration_ms",
] as const;

const FAILURE_COLS = [
  "reason",
  "scope",
  "format",
  "failures",
  "last_seen_at",
] as const;

const ALERT_COLS = [
  "id",
  "kind",
  "severity",
  "reason",
  "created_at",
  "updated_at",
] as const;

export function buildDiagnosticCsv(input: DiagnosticInput): string {
  const lines: string[] = [];

  lines.push(section("KPIs (janela atual)"));
  lines.push(rowToCsv([...KPI_COLS]));
  for (const r of input.kpis) {
    lines.push(
      rowToCsv([
        r.scope,
        r.format,
        r.total_runs,
        r.succeeded,
        r.failed,
        r.running,
        r.success_rate_pct,
        r.p95_duration_ms,
        r.avg_duration_ms,
      ]),
    );
  }

  lines.push("");
  lines.push(section("Últimas falhas (até 100)"));
  lines.push(rowToCsv([...FAILURE_COLS]));
  for (const r of input.failures.slice(0, 100)) {
    lines.push(rowToCsv([r.reason, r.scope, r.format, r.failures, r.last_seen_at]));
  }

  lines.push("");
  lines.push(section("Alertas abertos"));
  lines.push(rowToCsv([...ALERT_COLS]));
  for (const a of input.openAlerts) {
    lines.push(rowToCsv([a.id, a.kind, a.severity, a.reason, a.created_at, a.updated_at]));
  }

  return BOM + lines.join("\r\n");
}

export function diagnosticFilename(nowIso: string = new Date().toISOString()): string {
  const stamp = nowIso.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return `relatorios-ops-diagnostico-${stamp}.csv`;
}

/**
 * Efeito colateral: dispara download no browser. Nunca chamado em ambiente
 * server-side. Whitelist já aplicada em `buildDiagnosticCsv`.
 */
export function downloadDiagnosticCsv(input: DiagnosticInput): void {
  const csv = buildDiagnosticCsv(input);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = diagnosticFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DIAGNOSTIC_BOM = BOM;
