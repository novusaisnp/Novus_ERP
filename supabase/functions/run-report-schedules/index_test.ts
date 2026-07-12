import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  backoffDelayMs,
  buildIdempotencyKey,
  computeNextRunAt,
  validateViewState,
} from "../_shared/report-export/validateViewState.ts";
import { NoopProvider } from "../_shared/delivery/NoopProvider.ts";
import { exportCsvServer } from "../_shared/report-export/exportCsvServer.ts";

Deno.test("validateViewState — válido v1", () => {
  const r = validateViewState({
    schema_version: 1,
    scope: "vendas",
    filters: { date_from: "2026-01-01T00:00:00.000Z" },
  });
  assert(r.ok);
  assertEquals(r.data?.scope, "vendas");
});

Deno.test("validateViewState — schema_version não suportado", () => {
  const r = validateViewState({ schema_version: 2, scope: "vendas" });
  assertEquals(r.ok, false);
  assertEquals(r.error, "unsupported_schema_version");
});

Deno.test("validateViewState — objeto inválido", () => {
  const r = validateViewState(null);
  assertEquals(r.ok, false);
});

Deno.test("validateViewState — rejeita campos desconhecidos", () => {
  const r = validateViewState({ schema_version: 1, scope: "vendas", hack: 1 });
  assertEquals(r.ok, false);
});

Deno.test("computeNextRunAt — daily avança 1 dia se hora já passou", () => {
  const ref = new Date(Date.UTC(2026, 6, 12, 10, 0, 0));
  const next = computeNextRunAt({ frequency: "daily", hour: 9, minute: 0, day_of_week: null, day_of_month: null, reference: ref });
  assertEquals(next.toISOString(), "2026-07-13T09:00:00.000Z");
});

Deno.test("computeNextRunAt — weekly próximo dia da semana", () => {
  const ref = new Date(Date.UTC(2026, 6, 12, 12, 0, 0)); // domingo
  const next = computeNextRunAt({ frequency: "weekly", hour: 8, minute: 0, day_of_week: 3, day_of_month: null, reference: ref });
  assertEquals(next.getUTCDay(), 3);
  assert(next.getTime() > ref.getTime());
});

Deno.test("computeNextRunAt — monthly usa day_of_month", () => {
  const ref = new Date(Date.UTC(2026, 6, 20, 12, 0, 0));
  const next = computeNextRunAt({ frequency: "monthly", hour: 6, minute: 0, day_of_week: null, day_of_month: 5, reference: ref });
  assertEquals(next.getUTCDate(), 5);
  assertEquals(next.getUTCMonth(), 7); // agosto
});

Deno.test("buildIdempotencyKey — estável", () => {
  const d = new Date("2026-07-12T09:00:00.000Z");
  const a = buildIdempotencyKey("sched-1", d);
  const b = buildIdempotencyKey("sched-1", d);
  assertEquals(a, b);
  assertEquals(a, "sched-1:2026-07-12T09:00:00.000Z");
});

Deno.test("backoffDelayMs — 5m/15m/60m", () => {
  assertEquals(backoffDelayMs(1), 5 * 60 * 1000);
  assertEquals(backoffDelayMs(2), 15 * 60 * 1000);
  assertEquals(backoffDelayMs(3), 60 * 60 * 1000);
});

Deno.test("NoopProvider — retorna skipped", async () => {
  const p = new NoopProvider();
  const r = await p.send({
    runId: "r", scheduleId: "s", userId: "u", scope: "vendas",
    format: "csv", signedUrl: "https://x", recipients: [], scheduleName: "n",
    generatedAt: new Date().toISOString(),
  });
  assertEquals(r.status, "skipped");
  assertEquals(r.messageId, null);
});

Deno.test("exportCsvServer — inclui BOM e escapa aspas/vírgulas", () => {
  const bytes = exportCsvServer({
    columns: ["a", "b"],
    rows: [{ a: 'contém "aspas"', b: "linha,com,virgula" }],
  });
  const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
  assert(text.startsWith("\uFEFF"));
  assert(text.includes('"contém ""aspas"""'));
  assert(text.includes('"linha,com,virgula"'));
});
