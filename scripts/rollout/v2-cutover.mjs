#!/usr/bin/env node
// scripts/rollout/v2-cutover.mjs
// Operacionaliza o rollout V2 por tenant via RPC nas funções SQL do banco.
// Não altera UX. Não introduz secrets.
//
// Uso:
//   node scripts/rollout/v2-cutover.mjs \
//     --mode <dry-run|promote-dual|promote-v2-only|rollback-dual|rollback-v1> \
//     --tenant <uuid> --nome <text> [--min-events 20] [--wave pilot]
//
// Requer no ambiente:
//   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
//   ROLLOUT_ADMIN_JWT   -> JWT de um usuário com role 'admin' (ver has_role)
//
// Saídas: evidence/rollout/<YYYY-MM-DD>/<mode>-<tenant>-<nome>.json + .md
import fs from "node:fs/promises";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1]?.startsWith("--") ? "true" : arr[i + 1] ?? "true"]);
    return acc;
  }, []),
);

const MODE = args.mode;
const TENANT = args.tenant;
const NOME = args.nome;
const MIN_EVENTS = Number(args["min-events"] ?? 20);
const WAVE = args.wave ?? "adhoc";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const APIKEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const ADMIN_JWT = process.env.ROLLOUT_ADMIN_JWT;

if (!MODE || !TENANT || !NOME) {
  console.error("Usage: --mode <...> --tenant <uuid> --nome <text> [--min-events 20] [--wave name]");
  process.exit(2);
}
if (!SUPABASE_URL || !APIKEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(2);
}

const authHeader = `Bearer ${ADMIN_JWT || APIKEY}`;

async function rpc(fn, payload) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: APIKEY,
      authorization: authHeader,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { http: res.status, data };
}

async function readState() {
  const url =
    `${SUPABASE_URL}/rest/v1/webhook_configs` +
    `?select=signature_version,v2_only,v2_enforced_at,ativo` +
    `&empresa_representada_id=eq.${TENANT}` +
    `&nome=eq.${encodeURIComponent(NOME)}`;
  const res = await fetch(url, {
    headers: { apikey: APIKEY, authorization: authHeader },
  });
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

const today = new Date().toISOString().slice(0, 10);
const outDir = path.resolve("evidence", "rollout", today);
await fs.mkdir(outDir, { recursive: true });
const stem = `${MODE}-${TENANT}-${NOME}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
const startedAt = Date.now();

const before = await readState();
const readiness = await rpc("check_v2_readiness", {
  p_tenant: TENANT, p_nome: NOME, p_min_events: MIN_EVENTS,
});

let action = { skipped: true };
if (MODE === "dry-run") {
  action = { skipped: true, reason: "dry-run mode" };
} else if (MODE === "promote-dual") {
  action = await rpc("promote_to_dual", { p_tenant: TENANT, p_nome: NOME });
} else if (MODE === "promote-v2-only") {
  action = await rpc("promote_to_v2_only", {
    p_tenant: TENANT, p_nome: NOME, p_min_events: MIN_EVENTS,
  });
} else if (MODE === "rollback-dual") {
  action = await rpc("rollback_to_dual", { p_tenant: TENANT, p_nome: NOME });
} else if (MODE === "rollback-v1") {
  action = await rpc("rollback_to_v1", { p_tenant: TENANT, p_nome: NOME });
} else {
  console.error(`Unknown mode: ${MODE}`);
  process.exit(2);
}

const after = await readState();
const finishedAt = Date.now();
const elapsedMs = finishedAt - startedAt;

const report = {
  wave: WAVE,
  mode: MODE,
  tenant: TENANT,
  nome: NOME,
  min_events: MIN_EVENTS,
  started_at: new Date(startedAt).toISOString(),
  finished_at: new Date(finishedAt).toISOString(),
  elapsed_ms: elapsedMs,
  slo_rollback_ok: MODE.startsWith("rollback-") ? elapsedMs <= 5 * 60_000 : null,
  before,
  readiness,
  action,
  after,
};

await fs.writeFile(path.join(outDir, `${stem}.json`), JSON.stringify(report, null, 2));

const md = [
  `# Rollout V2 — ${MODE}`,
  ``,
  `- Wave: **${WAVE}**`,
  `- Tenant: \`${TENANT}\``,
  `- Nome: \`${NOME}\``,
  `- Elapsed: ${elapsedMs} ms${report.slo_rollback_ok !== null ? ` (SLO ≤5min: ${report.slo_rollback_ok ? "OK" : "FAIL"})` : ""}`,
  ``,
  `## Before`,
  "```json", JSON.stringify(before, null, 2), "```",
  `## Readiness (RPC)`,
  "```json", JSON.stringify(readiness, null, 2), "```",
  `## Action`,
  "```json", JSON.stringify(action, null, 2), "```",
  `## After`,
  "```json", JSON.stringify(after, null, 2), "```",
].join("\n");
await fs.writeFile(path.join(outDir, `${stem}.md`), md);

console.log(JSON.stringify({ ok: true, out: path.join(outDir, `${stem}.json`), elapsed_ms: elapsedMs, action_status: action?.data?.status ?? null, after }, null, 2));
