// P7.1 — Testes Deno para prune-report-artifacts.
// Cobre: elegível, não-elegível, idempotência, storage 404, falha DB.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";
import { pruneOnce } from "./index.ts";

interface RunRow {
  id: string;
  status: string;
  artifact_path: string | null;
  artifact_pruned_at: string | null;
  created_at: string;
  signed_url: string | null;
  signed_url_expires_at: string | null;
  artifact_prune_reason: string | null;
}

interface StorageBehavior {
  remove: (paths: string[]) => Promise<{ error: { message: string; statusCode?: string } | null }>;
}

function buildMock(rows: RunRow[], storage: StorageBehavior, opts: { dbFail?: Set<string> } = {}) {
  const state = { rows };

  const from = (table: string) => {
    if (table !== "report_schedule_runs") throw new Error("unexpected table " + table);
    // select builder
    const selectBuilder = () => {
      let filtered = [...state.rows];
      const b = {
        select() { return b; },
        eq(col: keyof RunRow, val: unknown) { filtered = filtered.filter((r) => r[col] === val); return b; },
        not(col: keyof RunRow, _op: string, _val: unknown) {
          filtered = filtered.filter((r) => r[col] !== null);
          return b;
        },
        is(col: keyof RunRow, val: unknown) { filtered = filtered.filter((r) => r[col] === val); return b; },
        lt(col: keyof RunRow, val: string) {
          filtered = filtered.filter((r) => String(r[col]) < val);
          return b;
        },
        order() { return b; },
        limit(_n: number) {
          return Promise.resolve({ data: filtered.map((r) => ({ id: r.id, artifact_path: r.artifact_path })), error: null });
        },
      };
      return b;
    };
    // update builder
    const updateBuilder = (patch: Partial<RunRow>) => {
      let targetId: string | null = null;
      const u = {
        eq(col: keyof RunRow, val: unknown) {
          if (col === "id") targetId = val as string;
          return u;
        },
        is(_col: keyof RunRow, _val: unknown) { return u; },
        then(resolve: (r: { error: { message: string } | null }) => void) {
          if (targetId && opts.dbFail?.has(targetId)) {
            resolve({ error: { message: "db_boom" } });
            return;
          }
          const row = state.rows.find((r) => r.id === targetId);
          if (row) Object.assign(row, patch);
          resolve({ error: null });
        },
      };
      return u;
    };
    return {
      select: () => selectBuilder(),
      update: (patch: Partial<RunRow>) => updateBuilder(patch),
    };
  };

  const admin = {
    from,
    storage: { from: (_b: string) => storage },
  } as unknown as SupabaseClient;
  return { admin, state };
}

const NOW = new Date("2026-08-01T00:00:00Z");
const OLD_CREATED = "2026-06-01T00:00:00Z"; // >30d atrás
const RECENT_CREATED = "2026-07-30T00:00:00Z"; // <30d

function makeRow(over: Partial<RunRow>): RunRow {
  return {
    id: crypto.randomUUID(),
    status: "succeeded",
    artifact_path: "user/a.csv",
    artifact_pruned_at: null,
    created_at: OLD_CREATED,
    signed_url: "https://signed/x",
    signed_url_expires_at: "2026-06-02T00:00:00Z",
    artifact_prune_reason: null,
    ...over,
  };
}

Deno.test("elegível => prune aplicado", async () => {
  const row = makeRow({});
  const { admin, state } = buildMock([row], { remove: () => Promise.resolve({ error: null }) });
  const s = await pruneOnce(admin, NOW);
  assertEquals(s.pruned, 1);
  assertEquals(s.storage_missing, 0);
  assertEquals(state.rows[0].artifact_path, null);
  assertEquals(state.rows[0].signed_url, null);
  assertEquals(state.rows[0].artifact_prune_reason, "retention_expired");
  assertEquals(state.rows[0].artifact_pruned_at !== null, true);
});

Deno.test("não elegível (recente) => sem alteração", async () => {
  const row = makeRow({ created_at: RECENT_CREATED });
  const { admin, state } = buildMock([row], { remove: () => Promise.resolve({ error: null }) });
  const s = await pruneOnce(admin, NOW);
  assertEquals(s.scanned, 0);
  assertEquals(s.pruned, 0);
  assertEquals(state.rows[0].artifact_path, "user/a.csv");
});

Deno.test("não elegível (já prunado) => sem alteração", async () => {
  const row = makeRow({ artifact_pruned_at: "2026-07-01T00:00:00Z" });
  const { admin } = buildMock([row], { remove: () => Promise.resolve({ error: null }) });
  const s = await pruneOnce(admin, NOW);
  assertEquals(s.scanned, 0);
});

Deno.test("storage 404 => conclui DB (idempotente)", async () => {
  const row = makeRow({});
  const { admin, state } = buildMock(
    [row],
    { remove: () => Promise.resolve({ error: { message: "Object not found", statusCode: "404" } }) },
  );
  const s = await pruneOnce(admin, NOW);
  assertEquals(s.pruned, 1);
  assertEquals(s.storage_missing, 1);
  assertEquals(state.rows[0].artifact_path, null);
  assertEquals(state.rows[0].artifact_prune_reason, "retention_expired");
});

Deno.test("segunda execução => idempotente sem erro", async () => {
  const row = makeRow({});
  const { admin } = buildMock([row], { remove: () => Promise.resolve({ error: null }) });
  await pruneOnce(admin, NOW);
  const s2 = await pruneOnce(admin, NOW);
  assertEquals(s2.scanned, 0);
  assertEquals(s2.pruned, 0);
});

Deno.test("falha DB após remove storage => próxima execução converge", async () => {
  const row = makeRow({ id: "run-fail-1" });
  const { admin, state } = buildMock(
    [row],
    { remove: () => Promise.resolve({ error: null }) },
    { dbFail: new Set(["run-fail-1"]) },
  );
  const s1 = await pruneOnce(admin, NOW);
  assertEquals(s1.db_failed, 1);
  assertEquals(s1.pruned, 0);
  // storage já removido, mas registro continua elegível — próxima run converge (storage 404 idempotente).
  // Segunda tentativa: agora sem dbFail.
  state.rows[0] = { ...state.rows[0] }; // no-op
  const { admin: admin2, state: state2 } = buildMock(
    [state.rows[0]],
    { remove: () => Promise.resolve({ error: { message: "not found", statusCode: "404" } }) },
  );
  const s2 = await pruneOnce(admin2, NOW);
  assertEquals(s2.pruned, 1);
  assertEquals(s2.storage_missing, 1);
  assertEquals(state2.rows[0].artifact_prune_reason, "retention_expired");
});
