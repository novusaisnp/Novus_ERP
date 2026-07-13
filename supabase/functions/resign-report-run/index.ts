// P5.2 — Edge function: regenera signed URL de um run já concluído.
// Não reprocessa export. Owner OU admin. Rate limit 10/dia/run.
import { createClient } from "npm:@supabase/supabase-js@2.110.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { authorizeResign, type RunSummary } from "./logic.ts";

const BUCKET = "report-exports";

interface ResignRequestBody {
  run_id?: unknown;
  ttl_seconds?: unknown;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(event: string, data: Record<string, unknown>): void {
  // Nunca logar signed_url completo — apenas booleano.
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "unauthorized", reason: "missing_auth" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "missing_env" }, 500);
  }

  // Client 1: contexto do usuário — usado para getClaims + has_role RPC.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.slice(7).trim();
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return json({ error: "unauthorized", reason: "missing_auth" }, 401);
  }
  const userId = String(claimsData.claims.sub);

  let body: ResignRequestBody;
  try {
    body = (await req.json()) as ResignRequestBody;
  } catch {
    return json({ error: "invalid_json", reason: "invalid_json" }, 400);
  }

  const runId = typeof body.run_id === "string" ? body.run_id.trim() : "";
  if (!runId || !/^[0-9a-f-]{36}$/i.test(runId)) {
    return json({ error: "invalid_run_id", reason: "invalid_run_id" }, 400);
  }

  // has_role via RPC (SECURITY DEFINER) — funciona com anon client autenticado.
  let isAdmin = false;
  const { data: roleData } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  isAdmin = Boolean(roleData);

  // Client 2: service role — leitura irrestrita do run e update.
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: runRow, error: runErr } = await adminClient
    .from("report_schedule_runs")
    .select("id,user_id,status,artifact_path,resign_count,resigned_at")
    .eq("id", runId)
    .maybeSingle();

  if (runErr) {
    log("run_read_error", { run_id: runId, err: runErr.message });
    return json({ error: "internal_error" }, 500);
  }

  const decision = authorizeResign({
    run: (runRow as RunSummary | null) ?? null,
    userId,
    isAdmin,
    ttlSecondsRaw: body.ttl_seconds,
    nowIso: new Date().toISOString(),
  });

  if (!decision.ok) {
    log("resign_denied", { run_id: runId, reason: decision.reason, status: decision.status });
    return json({ error: decision.reason, reason: decision.reason }, decision.status);
  }

  const run = runRow as RunSummary;

  // Gera nova signed URL — SEM reprocessar export.
  const { data: signed, error: signErr } = await adminClient.storage
    .from(BUCKET)
    .createSignedUrl(run.artifact_path!, decision.ttlSeconds);

  if (signErr || !signed?.signedUrl) {
    log("sign_failed", { run_id: runId, err: signErr?.message });
    return json({ error: "internal_error" }, 500);
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + decision.ttlSeconds * 1000).toISOString();

  const { error: updErr } = await adminClient
    .from("report_schedule_runs")
    .update({
      signed_url: signed.signedUrl,
      signed_url_expires_at: expiresAt,
      resigned_at: nowIso,
      resigned_by: userId,
      resign_count: decision.newResignCount,
    })
    .eq("id", runId);

  if (updErr) {
    log("update_failed", { run_id: runId, err: updErr.message });
    return json({ error: "internal_error" }, 500);
  }

  log("resign_ok", {
    run_id: runId,
    user_id: userId,
    is_admin: isAdmin,
    resign_count: decision.newResignCount,
    ttl_seconds: decision.ttlSeconds,
    has_signed_url: true,
  });

  // P6.3 — Auditoria operacional (whitelist explícita; sem signed_url/tokens).
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ipRaw = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const { error: auditErr } = await adminClient.from("report_ops_audit").insert({
    action: "resign",
    actor_user_id: userId,
    target_id: runId,
    metadata: {
      ttl_seconds: decision.ttlSeconds,
      resign_count: decision.newResignCount,
      is_admin: isAdmin,
      status: "success",
    },
    ip: ipRaw && ipRaw.length > 0 ? ipRaw : null,
  });
  if (auditErr) {
    log("audit_insert_failed", { run_id: runId, err: auditErr.message });
  }

  return json(
    {
      ok: true,
      run_id: runId,
      signed_url: signed.signedUrl,
      signed_url_expires_at: expiresAt,
      resign_count: decision.newResignCount,
      resigned_at: nowIso,
    },
    200,
  );
});
