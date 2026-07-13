// P6.4 — Testes de persistência de filtros e sanidade do CSV.
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOpsFilters, OPS_FILTERS_DEFAULT } from "@/hooks/useOpsFilters";
import {
  buildDiagnosticCsv,
  csvEscape,
  diagnosticFilename,
  DIAGNOSTIC_BOM,
} from "@/utils/exportOpsDiagnostic";
import type { OpsAlertRow } from "@/services/opsAlertsService";
import type {
  ReportRunFailureRow,
  ReportRunKpiRow,
} from "@/services/reportRunOpsService";

const USER = "user-1";
const KEY = "relatorios-ops:filters:v1:user-1";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useOpsFilters (P6.4)", () => {
  it("retorna defaults quando storage vazio", () => {
    const { result } = renderHook(() => useOpsFilters(USER));
    expect(result.current.filters).toEqual(OPS_FILTERS_DEFAULT);
  });

  it("persiste mudanças no localStorage e lê após reload", () => {
    const { result, rerender } = renderHook(() => useOpsFilters(USER));
    act(() => result.current.patch({ window: "7d", reason: "run_timeout", alertStatus: "open" }));

    const raw = window.localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toMatchObject({ window: "7d", reason: "run_timeout", alertStatus: "open" });

    // "Reload" — novo mount lê do storage.
    rerender();
    const { result: r2 } = renderHook(() => useOpsFilters(USER));
    expect(r2.current.filters.window).toBe("7d");
    expect(r2.current.filters.reason).toBe("run_timeout");
    expect(r2.current.filters.alertStatus).toBe("open");
  });

  it("fallback silencioso para defaults em JSON corrompido", () => {
    window.localStorage.setItem(KEY, "{not-json");
    const { result } = renderHook(() => useOpsFilters(USER));
    expect(result.current.filters).toEqual(OPS_FILTERS_DEFAULT);
  });

  it("fallback silencioso quando campos inválidos", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ window: "5y", alertStatus: "bogus", reason: 123 }),
    );
    const { result } = renderHook(() => useOpsFilters(USER));
    expect(result.current.filters).toEqual(OPS_FILTERS_DEFAULT);
  });

  it("reset volta a defaults", () => {
    const { result } = renderHook(() => useOpsFilters(USER));
    act(() => result.current.patch({ window: "30d" }));
    act(() => result.current.reset());
    expect(result.current.filters).toEqual(OPS_FILTERS_DEFAULT);
  });
});

describe("exportOpsDiagnostic (P6.4)", () => {
  const kpis: ReportRunKpiRow[] = [
    {
      scope: "vendas",
      format: "pdf",
      total_runs: 10,
      succeeded: 9,
      failed: 1,
      running: 0,
      success_rate_pct: 90,
      p95_duration_ms: 1234,
      avg_duration_ms: 500,
    },
  ];
  const failures: ReportRunFailureRow[] = [
    { reason: "run_timeout", scope: "vendas", format: "pdf", failures: 3, last_seen_at: "2026-07-13T12:00:00.000Z" },
  ];
  const openAlerts: OpsAlertRow[] = [
    {
      id: "a1",
      kind: "cron_heartbeat",
      severity: "page",
      reason: "heartbeat_stale",
      payload: { sensitive: "SHOULD_NOT_APPEAR" },
      acknowledged_by: "admin-x",
      resolved_at: null,
      created_at: "2026-07-13T12:00:00.000Z",
      updated_at: "2026-07-13T12:00:00.000Z",
    },
  ];

  it("gera CSV com BOM UTF-8", () => {
    const csv = buildDiagnosticCsv({ kpis, failures, openAlerts });
    expect(csv.startsWith(DIAGNOSTIC_BOM)).toBe(true);
  });

  it("escaping correto para aspas, vírgulas e quebras de linha", () => {
    expect(csvEscape('foo,bar')).toBe('"foo,bar"');
    expect(csvEscape('with "quote"')).toBe('"with ""quote"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape(null)).toBe("");
  });

  it("nome de arquivo com timestamp UTC", () => {
    const name = diagnosticFilename("2026-07-13T02:07:30.123Z");
    expect(name).toBe("relatorios-ops-diagnostico-20260713T020730Z.csv");
  });

  it("NÃO vaza campos sensíveis (signed_url/recipients/view_state/payload/tokens)", () => {
    const csv = buildDiagnosticCsv({ kpis, failures, openAlerts });
    expect(csv).not.toContain("signed_url");
    expect(csv).not.toContain("recipients");
    expect(csv).not.toContain("view_state");
    expect(csv).not.toContain("SHOULD_NOT_APPEAR"); // payload interno
    expect(csv).not.toContain("acknowledged_by"); // fora do whitelist
    expect(csv).not.toContain("admin-x");
  });

  it("inclui headers whitelisted e dados esperados", () => {
    const csv = buildDiagnosticCsv({ kpis, failures, openAlerts });
    expect(csv).toContain("scope,format,total_runs,succeeded,failed,running");
    expect(csv).toContain("reason,scope,format,failures,last_seen_at");
    expect(csv).toContain("id,kind,severity,reason,created_at,updated_at");
    expect(csv).toContain("run_timeout");
    expect(csv).toContain("cron_heartbeat");
  });
});
