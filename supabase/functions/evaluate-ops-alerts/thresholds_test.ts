// P6.2 — Testes puros dos limiares (Deno).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  evalBehindSchedules,
  evalFailureSpikes,
  evalHeartbeat,
  evalResignSaturation,
  evalStorageRate,
  evalStuckRuns,
} from "./thresholds.ts";

Deno.test("heartbeat: <=5min → null (ok)", () => {
  assertEquals(evalHeartbeat({ heartbeatLagSeconds: 60, runsLast15m: 3 }), null);
});
Deno.test("heartbeat: 6..15min → warning", () => {
  const r = evalHeartbeat({ heartbeatLagSeconds: 400, runsLast15m: 0 });
  assert(r);
  assertEquals(r!.severity, "warning");
  assertEquals(r!.reason, "heartbeat_slow");
});
Deno.test("heartbeat: >15min → page", () => {
  const r = evalHeartbeat({ heartbeatLagSeconds: 999, runsLast15m: 0 });
  assert(r);
  assertEquals(r!.severity, "page");
  assertEquals(r!.reason, "heartbeat_stale");
});

Deno.test("storage rate: amostra baixa → null", () => {
  assertEquals(evalStorageRate({ totalRuns1h: 5, storageErrorRatePct: 90 }), null);
});
Deno.test("storage rate: 5..20% → warning", () => {
  const r = evalStorageRate({ totalRuns1h: 50, storageErrorRatePct: 10 });
  assert(r);
  assertEquals(r!.severity, "warning");
});
Deno.test("storage rate: >=20% → page", () => {
  const r = evalStorageRate({ totalRuns1h: 50, storageErrorRatePct: 25 });
  assert(r);
  assertEquals(r!.severity, "page");
});

Deno.test("stuck runs: 0 → null", () => {
  assertEquals(evalStuckRuns({ stuckCount: 0, oldestAgeSeconds: null }), null);
});
Deno.test("stuck runs: >3 → page", () => {
  const r = evalStuckRuns({ stuckCount: 4, oldestAgeSeconds: 600 });
  assert(r);
  assertEquals(r!.severity, "page");
});
Deno.test("stuck runs: 1..3 e idade>5min → warning", () => {
  const r = evalStuckRuns({ stuckCount: 2, oldestAgeSeconds: 400 });
  assert(r);
  assertEquals(r!.severity, "warning");
});

Deno.test("failure spikes: 3..9 → warning; >=10 → page", () => {
  const rows = [
    { reason: "run_timeout", failures_15m: 5 },
    { reason: "sign_failed", failures_15m: 12 },
    { reason: "unknown", failures_15m: 1 },
  ];
  const out = evalFailureSpikes(rows);
  assertEquals(out.length, 2);
  assertEquals(out[0].severity, "warning");
  assertEquals(out[1].severity, "page");
});

Deno.test("resign saturation: countAt10>0 → page", () => {
  const r = evalResignSaturation({ countAt10: 1, countAt7: 3 });
  assert(r);
  assertEquals(r!.severity, "page");
});
Deno.test("resign saturation: só countAt7 → warning", () => {
  const r = evalResignSaturation({ countAt10: 0, countAt7: 2 });
  assert(r);
  assertEquals(r!.severity, "warning");
});

Deno.test("behind schedules: >20 → page", () => {
  const r = evalBehindSchedules({ countBehind: 22, maxDelaySeconds: 400 });
  assert(r);
  assertEquals(r!.severity, "page");
});
Deno.test("behind schedules: 6..20 → warning", () => {
  const r = evalBehindSchedules({ countBehind: 8, maxDelaySeconds: 400 });
  assert(r);
  assertEquals(r!.severity, "warning");
});
Deno.test("behind schedules: <=5 → null", () => {
  assertEquals(evalBehindSchedules({ countBehind: 4, maxDelaySeconds: 100 }), null);
});

// Dedupe/auto-resolve semantics — asserção estrutural:
// candidatos são identificados por `${kind}::${reason}` no index.ts.
// Aqui provamos que a mesma condição gera o mesmo par (dedupe possível).
Deno.test("candidato estável: mesma entrada → mesma (kind, reason)", () => {
  const a = evalHeartbeat({ heartbeatLagSeconds: 400, runsLast15m: 0 });
  const b = evalHeartbeat({ heartbeatLagSeconds: 400, runsLast15m: 0 });
  assertEquals(a?.kind, b?.kind);
  assertEquals(a?.reason, b?.reason);
});

Deno.test("condição normalizada não gera candidato (auto-resolve possível)", () => {
  assertEquals(evalStorageRate({ totalRuns1h: 100, storageErrorRatePct: 1 }), null);
  assertEquals(evalHeartbeat({ heartbeatLagSeconds: 30, runsLast15m: 5 }), null);
});
