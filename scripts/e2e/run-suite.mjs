#!/usr/bin/env node
// E2E suite: real HTTP calls against sync-webhook edge function.
// Secrets are read from process.env; nothing hardcoded that isn't E2E-only.
// Usage: node scripts/e2e/run-suite.mjs
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const APIKEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!SUPABASE_URL || !APIKEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(2);
}

// E2E-only secrets. These match seeded webhook_configs. Rotated on cleanup.
const SECRETS = {
  E2E_V1: process.env.T_V1_SECRET || "e2e_secret_v1_KHR8xW3Ptq",
  E2E_DUAL: process.env.T_DUAL_SECRET || "e2e_secret_dual_9mLpQr2sTv",
  E2E_V2: process.env.T_V2_SECRET || "e2e_secret_v2_ZbCn7Fa4Yj",
};
const TENANTS = {
  E2E_V1: "11111111-1111-1111-1111-111111111111",
  E2E_DUAL: "22222222-2222-2222-2222-222222222222",
  E2E_V2: "33333333-3333-3333-3333-333333333333",
};

const URL = `${SUPABASE_URL}/functions/v1/sync-webhook`;
const HEALTH_URL = `${SUPABASE_URL}/functions/v1/health-check`;
const PATH = "/functions/v1/sync-webhook";
const EVIDENCE = path.resolve("evidence");
await fs.mkdir(EVIDENCE, { recursive: true });

const hex = (b) => Buffer.from(b).toString("hex");
const hmacHex = (secret, data) =>
  crypto.createHmac("sha256", secret).update(data).digest("hex");
const sha256Hex = (data) => crypto.createHash("sha256").update(data).digest("hex");

function signV1(secret, rawBody) {
  return hmacHex(secret, rawBody);
}
function signV2(secret, tsSec, deliveryId, rawBody) {
  const canonical = ["POST", PATH, String(tsSec), deliveryId, sha256Hex(rawBody)].join("\n");
  return hmacHex(secret, canonical);
}

async function call(name, { tenantName, headers, body, expectStatus, expectContains }) {
  const empresaId = TENANTS[tenantName];
  const finalHeaders = {
    "content-type": "application/json",
    apikey: APIKEY,
    authorization: `Bearer ${APIKEY}`,
    "x-source-system": tenantName,
    "x-empresa-id": empresaId,
    ...headers,
  };
  const res = await fetch(URL, { method: "POST", headers: finalHeaders, body });
  const text = await res.text();
  const pass =
    res.status === expectStatus &&
    (!expectContains || text.includes(expectContains));
  const line = {
    scenario: name,
    tenant: tenantName,
    http_status: res.status,
    expected_status: expectStatus,
    expected_contains: expectContains ?? null,
    body: safeJson(text),
    pass,
  };
  await fs.writeFile(
    path.join(EVIDENCE, `${name}.http.json`),
    JSON.stringify(line, null, 2),
  );
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name} → HTTP ${res.status} :: ${text.slice(0, 200)}`);
  return line;
}
function safeJson(t) {
  try { return JSON.parse(t); } catch { return t; }
}

// ---- Health regression (before) ----
{
  const r = await fetch(HEALTH_URL, { headers: { apikey: APIKEY, authorization: `Bearer ${APIKEY}` } });
  const t = await r.text();
  console.log(`[HEALTH-BEFORE] ${r.status} ${t.slice(0, 120)}`);
  await fs.writeFile(path.join(EVIDENCE, "health-before.http.txt"), `${r.status}\n${t}`);
}

const results = [];
const nowSec = () => Math.floor(Date.now() / 1000);

// Fixed payload template — nonce distinguishes scenarios in logs
const payloadFor = (scn) => JSON.stringify({
  event: "sync",
  table: "clientes",
  data: { id: `e2e-${scn}`, cpf_cnpj: `000.000.000-${scn.replace(/[^0-9]/g, "0").padStart(2,"0")}` },
  timestamp: new Date().toISOString(),
  source_system: `E2E-${scn}`,
});

// ==== A) V2 valid on T_V2 → 200 ====
{
  const body = payloadFor("A");
  const ts = nowSec();
  const deliveryA = `e2e-A-${ts}`;
  const sig = signV2(SECRETS.E2E_V2, ts, deliveryA, body);
  results.push(await call("A_v2_valid", {
    tenantName: "E2E_V2",
    headers: {
      "x-webhook-signature-v2": sig,
      "x-webhook-timestamp": String(ts),
      "x-webhook-delivery": deliveryA,
    },
    body,
    expectStatus: 200,
  }));
  globalThis.__deliveryA = deliveryA;
  globalThis.__bodyA = body;
  globalThis.__tsA = ts;
}

// ==== B) V1 valid on T_DUAL → 200 ====
{
  const body = payloadFor("B");
  const sig = signV1(SECRETS.E2E_DUAL, body);
  results.push(await call("B_v1_dual", {
    tenantName: "E2E_DUAL",
    headers: { "x-webhook-signature": sig },
    body,
    expectStatus: 200,
  }));
}

// ==== C) v2_only rejects V1 → 400 signature_version_required ====
{
  const body = payloadFor("C");
  const sig = signV1(SECRETS.E2E_V2, body);
  results.push(await call("C_v2only_rejects_v1", {
    tenantName: "E2E_V2",
    headers: { "x-webhook-signature": sig },
    body,
    expectStatus: 400,
    expectContains: "signature_version_required",
  }));
}

// ==== D) V2 invalid → 401 invalid_signature_v2 ====
{
  const body = payloadFor("D");
  const ts = nowSec();
  const deliveryD = `e2e-D-${ts}`;
  results.push(await call("D_v2_invalid", {
    tenantName: "E2E_V2",
    headers: {
      "x-webhook-signature-v2": "deadbeef".repeat(8), // 64 hex chars, wrong
      "x-webhook-timestamp": String(ts),
      "x-webhook-delivery": deliveryD,
    },
    body,
    expectStatus: 401,
    expectContains: "invalid_signature_v2",
  }));
}

// ==== E) Duplicate delivery (reuse A's delivery_id) → 200 duplicate_delivery_ignored ====
{
  const body = globalThis.__bodyA;
  const ts = globalThis.__tsA;
  const deliveryA = globalThis.__deliveryA;
  const sig = signV2(SECRETS.E2E_V2, ts, deliveryA, body);
  results.push(await call("E_duplicate_delivery", {
    tenantName: "E2E_V2",
    headers: {
      "x-webhook-signature-v2": sig,
      "x-webhook-timestamp": String(ts),
      "x-webhook-delivery": deliveryA,
    },
    body,
    expectStatus: 200,
    expectContains: "duplicate_delivery_ignored",
  }));
}

// ==== F) Anti-replay strict — timestamp now-600s → 400 timestamp_out_of_window ====
{
  const body = payloadFor("F");
  const ts = nowSec() - 600;
  const deliveryF = `e2e-F-${ts}`;
  const sig = signV2(SECRETS.E2E_V2, ts, deliveryF, body);
  results.push(await call("F_replay_out_of_window", {
    tenantName: "E2E_V2",
    headers: {
      "x-webhook-signature-v2": sig,
      "x-webhook-timestamp": String(ts),
      "x-webhook-delivery": deliveryF,
    },
    body,
    expectStatus: 400,
    expectContains: "timestamp_out_of_window",
  }));
}

// ---- Health regression (after) ----
{
  const r = await fetch(HEALTH_URL, { headers: { apikey: APIKEY, authorization: `Bearer ${APIKEY}` } });
  const t = await r.text();
  console.log(`[HEALTH-AFTER] ${r.status} ${t.slice(0, 120)}`);
  await fs.writeFile(path.join(EVIDENCE, "health-after.http.txt"), `${r.status}\n${t}`);
}

// ---- Summary ----
const summary = {
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  failed: results.filter((r) => !r.pass).map((r) => r.scenario),
  results,
};
await fs.writeFile(path.join(EVIDENCE, "summary.json"), JSON.stringify(summary, null, 2));
console.log(`\nRESULT: ${summary.passed}/${summary.total} passed`);
if (summary.failed.length) console.log(`FAILED: ${summary.failed.join(", ")}`);
process.exit(summary.passed === summary.total ? 0 : 1);
