// P7.1 — Edge function: expurga artefatos de relatórios expirados.
// - Sem logs sensíveis (nunca signed_url).
// - Idempotente: storage 404 é tratado como sucesso e prossegue update DB.
// - service_role only (chamada por cron via net.http_post).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  BATCH_SIZE,
  RETENTION_DAYS,
  RETENTION_REASON,
  retentionCutoffIso,
} from "../_shared/report-export/retention.ts";

const BUCKET = "report-exports";

interface EligibleRun {
  id: string;
  artifact_path: string;
}

export interface PruneSummary {
  scanned: number;
  pruned: number;
  storage_missing: number;
  db_failed: number;
  errors: Array<{ id: string; stage: "storage" | "db"; message: string }>;
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

function isNotFound(err: { message?: string; statusCode?: string | number } | null | undefined): boolean {
  if (!err) return false;
  const code = String(err.statusCode ?? "");
  if (code === "404") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("not found") || msg.includes("object not found") || msg.includes("does not exist");
}

export async function pruneOnce(admin: SupabaseClient, now: Date = new Date()): Promise<PruneSummary> {
  const cutoff = retentionCutoffIso(now, RETENTION_DAYS);
  const summary: PruneSummary = { scanned: 0, pruned: 0, storage_missing: 0, db_failed: 0, errors: [] };

  const { data, error } = await admin
    .from("report_schedule_runs")
    .select("id,artifact_path")
    .eq("status", "succeeded")
    .not("artifact_path", "is", null)
    .is("artifact_pruned_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    log("prune_select_failed", { message: error.message });
    throw new Error(`prune_select_failed: ${error.message}`);
  }

  const runs = (data ?? []) as EligibleRun[];
  summary.scanned = runs.length;

  for (const run of runs) {
    // 1) remover do storage
    const { error: rmErr } = await admin.storage.from(BUCKET).remove([run.artifact_path]);
    if (rmErr) {
      if (isNotFound(rmErr as { message?: string; statusCode?: string | number })) {
        summary.storage_missing += 1;
        log("prune_storage_missing", { run_id: run.id });
      } else {
        summary.errors.push({ id: run.id, stage: "storage", message: rmErr.message });
        log("prune_storage_failed", { run_id: run.id, message: rmErr.message });
        continue;
      }
    }

    // 2) atualizar DB
    const { error: upErr } = await admin
      .from("report_schedule_runs")
      .update({
        artifact_path: null,
        signed_url: null,
        signed_url_expires_at: null,
        artifact_pruned_at: new Date().toISOString(),
        artifact_prune_reason: RETENTION_REASON,
      })
      .eq("id", run.id)
      .is("artifact_pruned_at", null);

    if (upErr) {
      summary.db_failed += 1;
      summary.errors.push({ id: run.id, stage: "db", message: upErr.message });
      log("prune_db_failed", { run_id: run.id, message: upErr.message });
      continue;
    }

    summary.pruned += 1;
  }

  log("prune_done", {
    scanned: summary.scanned,
    pruned: summary.pruned,
    storage_missing: summary.storage_missing,
    db_failed: summary.db_failed,
  });

  return summary;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "missing_env" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const summary = await pruneOnce(admin);
    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
