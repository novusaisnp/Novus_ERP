// P5.2 — Testes Deno para o núcleo puro de resign.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  authorizeResign,
  DEFAULT_TTL_SECONDS,
  MAX_RESIGNS_PER_DAY,
  MAX_TTL_SECONDS,
  normalizeTtl,
  type RunSummary,
} from "./logic.ts";

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

Deno.test("normalizeTtl — default quando ausente", () => {
  assertEquals(normalizeTtl(undefined), DEFAULT_TTL_SECONDS);
  assertEquals(normalizeTtl(null), DEFAULT_TTL_SECONDS);
});

Deno.test("normalizeTtl — rejeita não inteiro / fora do range", () => {
  assertEquals(normalizeTtl(0), null);
  assertEquals(normalizeTtl(-1), null);
  assertEquals(normalizeTtl(MAX_TTL_SECONDS + 1), null);
  assertEquals(normalizeTtl(3.14), null);
  assertEquals(normalizeTtl("abc"), null);
});

Deno.test("owner pode resign (200 lógico)", () => {
  const r = authorizeResign({
    run: baseRun(),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.ttlSeconds, DEFAULT_TTL_SECONDS);
    assertEquals(r.newResignCount, 1);
  }
});

Deno.test("admin pode resign run de outro usuário", () => {
  const r = authorizeResign({
    run: baseRun({ user_id: OTHER }),
    userId: OWNER,
    isAdmin: true,
    ttlSecondsRaw: 3600,
    nowIso: NOW,
  });
  assert(r.ok);
});

Deno.test("user A tentando run de user B => 403 not_owner", () => {
  const r = authorizeResign({
    run: baseRun({ user_id: OTHER }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.status, 403);
    assertEquals(r.reason, "not_owner");
  }
});

Deno.test("run inexistente => 404 run_missing", () => {
  const r = authorizeResign({
    run: null,
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.status, 404);
    assertEquals(r.reason, "run_missing");
  }
});

Deno.test("run sem artifact_path => 404 artifact_missing", () => {
  const r = authorizeResign({
    run: baseRun({ artifact_path: null }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.status, 404);
    assertEquals(r.reason, "artifact_missing");
  }
});

Deno.test("run status != succeeded => 409 run_not_succeeded", () => {
  for (const status of ["running", "failed", "pending"]) {
    const r = authorizeResign({
      run: baseRun({ status }),
      userId: OWNER,
      isAdmin: false,
      ttlSecondsRaw: undefined,
      nowIso: NOW,
    });
    assertEquals(r.ok, false);
    if (!r.ok) {
      assertEquals(r.status, 409);
      assertEquals(r.reason, "run_not_succeeded");
    }
  }
});

Deno.test("ttl inválido (>604800 ou <=0) => 422 ttl_out_of_range", () => {
  for (const bad of [0, -1, MAX_TTL_SECONDS + 1]) {
    const r = authorizeResign({
      run: baseRun(),
      userId: OWNER,
      isAdmin: false,
      ttlSecondsRaw: bad,
      nowIso: NOW,
    });
    assertEquals(r.ok, false);
    if (!r.ok) {
      assertEquals(r.status, 422);
      assertEquals(r.reason, "ttl_out_of_range");
    }
  }
});

Deno.test(`rate limit ${MAX_RESIGNS_PER_DAY}/dia — 11ª tentativa => 429`, () => {
  const r = authorizeResign({
    run: baseRun({
      resign_count: MAX_RESIGNS_PER_DAY,
      resigned_at: "2026-07-13T09:00:00.000Z", // mesmo dia UTC
    }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.status, 429);
    assertEquals(r.reason, "rate_limited");
  }
});

Deno.test("rate limit reseta em novo dia UTC", () => {
  const r = authorizeResign({
    run: baseRun({
      resign_count: MAX_RESIGNS_PER_DAY,
      resigned_at: "2026-07-12T23:00:00.000Z", // dia anterior
    }),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  assert(r.ok);
  if (r.ok) assertEquals(r.newResignCount, 1);
});

Deno.test("export nunca é reexecutado — logic apenas decide, não gera artefato", () => {
  // Contrato: authorizeResign é síncrono e puro (não faz IO nem toca no artefato).
  // A verificação é estrutural: função não retorna nenhuma referência a export.
  const r = authorizeResign({
    run: baseRun(),
    userId: OWNER,
    isAdmin: false,
    ttlSecondsRaw: undefined,
    nowIso: NOW,
  });
  const asJson = JSON.stringify(r);
  assert(!asJson.includes("csv"));
  assert(!asJson.includes("xlsx"));
  assert(!asJson.includes("pdf"));
});
