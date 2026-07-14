// P6.2 — Edge function: avalia probes → abre/dedupe/resolve alertas.
// Cron sugerido: */5 * * * * (agendado via pg_cron/net.http_post pelo operador).
// Sem dependência de email/DELIVERY_PROVIDER.
import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  ALL_ALERT_KINDS,
  evalBehindSchedules,
  evalFailureSpikes,
  evalFiscalCertificadoExpira,
  evalFiscalErroEdge,
  evalFiscalProcessandoStuck,
  evalFiscalRejeicaoAlta,
  evalHeartbeat,
  evalResignSaturation,
  evalStorageRate,
  evalStuckRuns,
  type AlertCandidate,
} from "./thresholds.ts";

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "missing_env" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const candidates: AlertCandidate[] = [];

  try {
    // PROBE 1 — heartbeat
    const { data: hbRow } = await admin
      .from("report_schedule_runs")
      .select("started_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastStartedIso = (hbRow?.started_at as string | null) ?? null;
    const lagSec = lastStartedIso
      ? Math.max(0, Math.floor((Date.now() - new Date(lastStartedIso).getTime()) / 1000))
      : null;

    const sinceIso15 = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: runs15 } = await admin
      .from("report_schedule_runs")
      .select("id", { count: "exact", head: true })
      .gte("started_at", sinceIso15);

    const cHeartbeat = evalHeartbeat({
      heartbeatLagSeconds: lagSec,
      runsLast15m: runs15 ?? 0,
    });
    if (cHeartbeat) candidates.push(cHeartbeat);

    // PROBE 2 — storage error rate (1h)
    const sinceIso1h = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: h1 } = await admin
      .from("report_schedule_runs")
      .select("status, error_message")
      .gte("started_at", sinceIso1h)
      .limit(5000);

    const rows1h = (h1 ?? []) as Array<{ status: string | null; error_message: string | null }>;
    const total = rows1h.length;
    const storageErr = rows1h.filter((r) => {
      const m = r.error_message ?? "";
      return m.startsWith("upload_failed:") || m.startsWith("sign_failed:");
    }).length;
    const ratePct = total > 0 ? Math.round((1000 * storageErr) / total) / 10 : 0;

    const cStorage = evalStorageRate({ totalRuns1h: total, storageErrorRatePct: ratePct });
    if (cStorage) candidates.push(cStorage);

    // PROBE 3 — stuck runs
    const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: stuck } = await admin
      .from("report_schedule_runs")
      .select("started_at")
      .eq("status", "running")
      .is("finished_at", null)
      .lt("started_at", stuckThreshold)
      .order("started_at", { ascending: true })
      .limit(50);
    const stuckRows = (stuck ?? []) as Array<{ started_at: string }>;
    const oldest = stuckRows[0]?.started_at ?? null;
    const oldestAgeSec = oldest
      ? Math.floor((Date.now() - new Date(oldest).getTime()) / 1000)
      : null;
    const cStuck = evalStuckRuns({
      stuckCount: stuckRows.length,
      oldestAgeSeconds: oldestAgeSec,
    });
    if (cStuck) candidates.push(cStuck);

    // PROBE 4 — failure spikes (15 min)
    const { data: fail15 } = await admin
      .from("report_schedule_runs")
      .select("error_message")
      .eq("status", "failed")
      .gte("finished_at", sinceIso15)
      .limit(5000);
    const bucket = new Map<string, number>();
    for (const r of (fail15 ?? []) as Array<{ error_message: string | null }>) {
      const reason = (r.error_message ?? "unknown:").split(":")[0] || "unknown";
      bucket.set(reason, (bucket.get(reason) ?? 0) + 1);
    }
    const spikeRows = Array.from(bucket.entries()).map(([reason, failures_15m]) => ({
      reason,
      failures_15m,
    }));
    candidates.push(...evalFailureSpikes(spikeRows));

    // PROBE 5 — resign saturation
    const { data: resignRows } = await admin
      .from("report_schedule_runs")
      .select("resign_count")
      .gte("resign_count", 7)
      .limit(200);
    const resignArr = (resignRows ?? []) as Array<{ resign_count: number | null }>;
    const at10 = resignArr.filter((r) => (r.resign_count ?? 0) >= 10).length;
    const at7 = resignArr.filter((r) => (r.resign_count ?? 0) >= 7).length;
    const cResign = evalResignSaturation({ countAt10: at10, countAt7: at7 });
    if (cResign) candidates.push(cResign);

    // PROBE 6 — schedules atrasados
    const behindThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: behind } = await admin
      .from("report_schedules")
      .select("next_run_at")
      .eq("enabled", true)
      .lt("next_run_at", behindThreshold)
      .order("next_run_at", { ascending: true })
      .limit(50);
    const behindArr = (behind ?? []) as Array<{ next_run_at: string | null }>;
    const oldestNext = behindArr[0]?.next_run_at ?? null;
    const maxDelay = oldestNext
      ? Math.floor((Date.now() - new Date(oldestNext).getTime()) / 1000)
      : null;
    const cBehind = evalBehindSchedules({
      countBehind: behindArr.length,
      maxDelaySeconds: maxDelay,
    });
    if (cBehind) candidates.push(cBehind);
  } catch (err) {
    log("probes_failed", { err: (err as Error).message });
    return json({ error: "probes_failed" }, 500);
  }

  const nowIso = new Date().toISOString();
  let opened = 0;
  let reopenedSkipped = 0;
  let resolved = 0;

  // 1) UPSERT/dedup: para cada candidato, se já existe alerta aberto com mesma
  // (kind, reason) → apenas atualiza payload/severity/updated_at; senão, insere.
  for (const cand of candidates) {
    const { data: existing } = await admin
      .from("report_ops_alerts")
      .select("id")
      .eq("kind", cand.kind)
      .eq("reason", cand.reason)
      .is("resolved_at", null)
      .maybeSingle();

    if (existing?.id) {
      reopenedSkipped += 1;
      await admin
        .from("report_ops_alerts")
        .update({ severity: cand.severity, payload: cand.payload })
        .eq("id", existing.id);
      continue;
    }

    const { error: insErr } = await admin.from("report_ops_alerts").insert({
      kind: cand.kind,
      severity: cand.severity,
      reason: cand.reason,
      payload: cand.payload,
    });
    if (insErr) {
      log("alert_insert_failed", { kind: cand.kind, reason: cand.reason, err: insErr.message });
      continue;
    }
    opened += 1;
  }

  // 2) Auto-resolve: alertas abertos cuja combinação (kind, reason) NÃO está
  // mais entre candidates → set resolved_at = now.
  const activeKeys = new Set(candidates.map((c) => `${c.kind}::${c.reason}`));
  const { data: openAlerts } = await admin
    .from("report_ops_alerts")
    .select("id, kind, reason")
    .is("resolved_at", null)
    .in("kind", ALL_ALERT_KINDS as unknown as string[]);

  for (const a of (openAlerts ?? []) as Array<{ id: string; kind: string; reason: string }>) {
    const key = `${a.kind}::${a.reason}`;
    if (!activeKeys.has(key)) {
      const { error: resErr } = await admin
        .from("report_ops_alerts")
        .update({ resolved_at: nowIso })
        .eq("id", a.id);
      if (!resErr) resolved += 1;
    }
  }

  log("evaluate_done", {
    candidates: candidates.length,
    opened,
    updated_open: reopenedSkipped,
    auto_resolved: resolved,
  });

  return json(
    {
      ok: true,
      evaluated_at: nowIso,
      candidates: candidates.length,
      opened,
      updated_open: reopenedSkipped,
      auto_resolved: resolved,
    },
    200,
  );
});
