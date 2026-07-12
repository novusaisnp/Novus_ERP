import { describe, it, expect } from "vitest";
import {
  clientNextRunAt,
  normalizeViewState,
  parseRun,
  parseSchedule,
  validateScheduleInput,
  type ReportScheduleInput,
} from "@/types/reportSchedule";
import { statusBadge } from "@/components/relatorios/ScheduleList";

describe("reportSchedule types", () => {
  it("normalizeViewState carimba schema_version=1 e scope", () => {
    const vs = normalizeViewState("vendas", {
      dataInicio: "2026-01-01",
      dataFim: "2026-01-31",
      status: "CONFIRMADO",
      agrupamento: "status",
    });
    expect(vs.schema_version).toBe(1);
    expect(vs.scope).toBe("vendas");
    expect(vs.filters.status).toEqual(["CONFIRMADO"]);
    expect(vs.filters.date_from).toBeDefined();
    expect(vs.group_by).toEqual(["status"]);
  });

  it("normalizeViewState ignora status=TODOS e agrupamento=nenhum", () => {
    const vs = normalizeViewState("financeiro", { status: "TODOS", agrupamento: "nenhum" });
    expect(vs.filters.status).toBeUndefined();
    expect(vs.group_by).toBeUndefined();
  });

  it("validateScheduleInput exige nome", () => {
    const base: Partial<ReportScheduleInput> = {
      frequency: "daily",
      hour_utc: 8,
      day_of_week: null,
      day_of_month: null,
      recipients: [],
      view_state: { schema_version: 1, scope: "vendas", filters: {} },
    };
    expect(validateScheduleInput({ ...base, name: "" }).errors.name).toBeDefined();
    expect(validateScheduleInput({ ...base, name: "OK" }).ok).toBe(true);
  });

  it("validateScheduleInput exige day_of_week em weekly", () => {
    const r = validateScheduleInput({
      name: "x",
      frequency: "weekly",
      hour_utc: 8,
      day_of_week: null,
      day_of_month: null,
      recipients: [],
      view_state: { schema_version: 1, scope: "vendas", filters: {} },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.day_of_week).toBeDefined();
  });

  it("validateScheduleInput exige day_of_month 1-28 em monthly", () => {
    const r = validateScheduleInput({
      name: "x",
      frequency: "monthly",
      hour_utc: 8,
      day_of_week: null,
      day_of_month: 31,
      recipients: [],
      view_state: { schema_version: 1, scope: "vendas", filters: {} },
    });
    expect(r.ok).toBe(false);
    expect(r.errors.day_of_month).toBeDefined();
  });

  it("validateScheduleInput limita recipients em 5 e valida e-mail", () => {
    const view_state = { schema_version: 1 as const, scope: "vendas" as const, filters: {} };
    const base: Partial<ReportScheduleInput> = {
      name: "x", frequency: "daily", hour_utc: 8,
      day_of_week: null, day_of_month: null, view_state,
    };
    expect(validateScheduleInput({ ...base, recipients: ["invalido"] }).errors.recipients).toBeDefined();
    expect(validateScheduleInput({ ...base, recipients: ["a@a.com", "b@b.com", "c@c.com", "d@d.com", "e@e.com", "f@f.com"] }).errors.recipients).toBeDefined();
    expect(validateScheduleInput({ ...base, recipients: ["a@a.com"] }).ok).toBe(true);
  });

  it("validateScheduleInput rejeita view_state com schema_version diferente de 1", () => {
    const r = validateScheduleInput({
      name: "x", frequency: "daily", hour_utc: 8, day_of_week: null, day_of_month: null,
      recipients: [],
      // deno-lint-ignore no-explicit-any
      view_state: { schema_version: 2, scope: "vendas", filters: {} } as unknown as ReportScheduleInput["view_state"],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.view_state).toBeDefined();
  });

  it("clientNextRunAt daily avança para dia seguinte se hora passou", () => {
    const ref = new Date(Date.UTC(2026, 6, 12, 10, 0, 0));
    const next = clientNextRunAt({ frequency: "daily", hour_utc: 9, day_of_week: null, day_of_month: null, reference: ref });
    expect(next.toISOString()).toBe("2026-07-13T09:00:00.000Z");
  });

  it("clientNextRunAt weekly encontra próximo weekday", () => {
    const ref = new Date(Date.UTC(2026, 6, 12, 12, 0, 0));
    const next = clientNextRunAt({ frequency: "weekly", hour_utc: 8, day_of_week: 3, day_of_month: null, reference: ref });
    expect(next.getUTCDay()).toBe(3);
    expect(next.getTime()).toBeGreaterThan(ref.getTime());
  });

  it("parseSchedule normaliza view_state inválido", () => {
    const s = parseSchedule({
      id: "1", user_id: "u", name: "n", scope: "vendas", format: "csv", frequency: "daily",
      hour_utc: 8, day_of_week: null, day_of_month: null, next_run_at: "2026-01-01",
      last_run_at: null, recipients: [], view_state: { garbage: true }, enabled: true,
      created_at: "2026-01-01", updated_at: "2026-01-01",
    });
    expect(s.view_state.schema_version).toBe(1);
  });

  it("parseRun preserva status e delivery_status", () => {
    const r = parseRun({
      id: "r", schedule_id: "s", user_id: "u", idempotency_key: "k", attempt: 2,
      status: "succeeded", started_at: "2026-01-01", finished_at: null,
      artifact_path: null, signed_url: "https://x", signed_url_expires_at: null,
      delivery_status: "skipped", delivery_message_id: null, delivery_reason: "email_domain_unavailable",
      error_message: null, created_at: "2026-01-01",
    });
    expect(r.status).toBe("succeeded");
    expect(r.delivery_status).toBe("skipped");
    expect(r.signed_url).toBe("https://x");
  });
});

describe("statusBadge mapping", () => {
  it("mapeia status conhecidos", () => {
    expect(statusBadge("succeeded").variant).toBe("default");
    expect(statusBadge("failed").variant).toBe("destructive");
    expect(statusBadge("running").variant).toBe("secondary");
    expect(statusBadge("pending").variant).toBe("outline");
  });
  it("fallback em status desconhecido", () => {
    const b = statusBadge("desconhecido");
    expect(b.variant).toBe("outline");
    expect(b.label).toBe("desconhecido");
  });
});
