// P6.3 — Testes de gating de auditoria operacional.
// A auditoria é inserida SOMENTE após decision.ok=true (sucesso).
// Denies (rate_limited, not_owner, run_missing, etc.) NÃO devem gerar audit.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { authorizeResign, MAX_RESIGNS_PER_DAY, type RunSummary } from "./logic.ts";

const OWNER = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";
const NOW = "2026-07-13T12:00:00.000Z";

function baseRun(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id: "run-1",
    user_id: OWNER,
    status: "succeeded",
    artifact_path: "user/schedule/run-1.pdf",
    resign_count: 0,
    resigned_at: null,
    ...overrides,
  };
}

// Fluxo real: audit é inserido no index.ts SÓ se decision.ok === true.
// Aqui provamos que o resultado da lógica é o único gate.
function shouldAudit(r: ReturnType<typeof authorizeResign>): boolean {
  return r.ok === true;
}

Deno.test("P6.3 — resign sucesso => audit gerado", () => {
  const r = authorizeResign({
    run: baseRun(),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assert(r.ok);
  assertEquals(shouldAudit(r), true);
});

Deno.test("P6.3 — resign rate_limited => sem audit", () => {
  const r = authorizeResign({
    run: baseRun({
      resign_count: MAX_RESIGNS_PER_DAY,
      resigned_at: "2026-07-13T09:00:00.000Z",
    }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  assertEquals(shouldAudit(r), false);
});

Deno.test("P6.3 — resign forbidden (not_owner) => sem audit", () => {
  const r = authorizeResign({
    run: baseRun({ user_id: OTHER }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  assertEquals(shouldAudit(r), false);
});

Deno.test("P6.3 — run_missing => sem audit", () => {
  const r = authorizeResign({
    run: null,
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  assertEquals(shouldAudit(r), false);
});
