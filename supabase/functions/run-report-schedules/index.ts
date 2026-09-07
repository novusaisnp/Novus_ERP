// run-report-schedules — edge function core do P4.2A.
// Fluxo: seleciona schedules due -> cria run idempotente -> valida view_state ->
// carrega dados -> gera artefato -> upload -> signed URL -> NoopProvider (skipped) ->
// atualiza schedule.next_run_at. Retry/backoff em falhas (5m/15m/60m, max 3 tentativas).

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.110.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { isInternalRequest } from "../_shared/internal-auth.ts";

import { resolveDeliveryProvider } from "../_shared/delivery/resolveProvider.ts";
import type { DeliveryProvider } from "../_shared/delivery/DeliveryProvider.ts";
import {
  backoffDelayMs,
  buildIdempotencyKey,
  computeNextRunAt,
  validateViewState,
} from "../_shared/report-export/validateViewState.ts";
import { exportCsvServer } from "../_shared/report-export/exportCsvServer.ts";
import { exportXlsxServer } from "../_shared/report-export/exportXlsxServer.ts";
import { exportPdfServer } from "../_shared/report-export/exportPdfServer.ts";
import { resolveBrandingForEmpresa, resolveBrandingForUser, type Branding } from "../_shared/report-export/branding.ts";
import { maxRowsForFormat, PAGE_SIZE, RUN_TIMEOUT_MS, type ExportFormat } from "../_shared/report-export/limits.ts";
import { classifyReason, isDefinitive } from "../_shared/report-export/errorCodes.ts";

const BUCKET = "report-exports";
const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_ATTEMPTS = 3;
const BATCH_LIMIT = 10;

const activeProvider: DeliveryProvider = resolveDeliveryProvider({
  DELIVERY_PROVIDER: Deno.env.get("DELIVERY_PROVIDER") ?? "noop",
  SENDER_DOMAIN: Deno.env.get("SENDER_DOMAIN"),
  FROM_DOMAIN: Deno.env.get("FROM_DOMAIN"),
});

interface ScheduleRow {
  id: string;
  user_id: string;
  name: string;
  scope: "vendas" | "financeiro";
  format: "csv" | "xlsx" | "pdf";
  frequency: "daily" | "weekly" | "monthly";
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  next_run_at: string;
  recipients: string[];
  view_state: unknown;
  enabled: boolean;
}

function log(event: string, data: Record<string, unknown>): void {
  // Logs mínimos, sem payload sensível (sem view_state, sem recipients).
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...data }));
}

function nowIso(): string {
  return new Date().toISOString();
}

// P5.3: leitura paginada (PAGE_SIZE) com ordenação estável (chave primária desc + id asc)
// e parada imediata ao ultrapassar o cap do formato (row_limit_exceeded).
// deno-lint-ignore no-explicit-any
async function loadScopeData(
  client: SupabaseClient,
  scope: "vendas" | "financeiro",
  vs: any,
  format: ExportFormat,
  signal: AbortSignal,
): Promise<{ columns: string[]; rows: Array<Record<string, unknown>> }> {
  const filters = vs.filters ?? {};
  const cap = maxRowsForFormat(format);

  const config = scope === "vendas"
    ? {
        table: "vendas",
        select: "id,empresa_representada_id,numero_venda,cliente_id,data_venda,valor_total,status,tipo",
        orderCol: "data_venda",
        dateCol: "data_venda",
        columns: ["numero_venda", "data_venda", "cliente_id", "valor_total", "status", "tipo"],
      }
    : {
        table: "contas_receber",
        select: "id,empresa_representada_id,descricao,cliente_id,valor_original,data_vencimento,status",
        orderCol: "data_vencimento",
        dateCol: "data_vencimento",
        columns: ["descricao", "data_vencimento", "cliente_id", "valor_original", "status"],
      };

  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  let from = 0;

  // Buscamos até cap + 1 para detectar overflow determinístico.
  while (rows.length <= cap) {
    if (signal.aborted) throw new Error("run_timeout:scope_pagination");

    const to = from + PAGE_SIZE - 1;
    let q = client
      .from(config.table)
      .select(config.select)
      .is("deleted_at", null)
      .order(config.orderCol, { ascending: false })
      .order("id", { ascending: true })
      .range(from, to)
      .abortSignal(signal);

    if (filters.date_from) q = q.gte(config.dateCol, String(filters.date_from).slice(0, 10));
    if (filters.date_to) q = q.lte(config.dateCol, String(filters.date_to).slice(0, 10));
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      q = q.in("status", filters.status);
    }
    if (filters.empresa_representada_id) q = q.eq("empresa_representada_id", filters.empresa_representada_id);

    const { data, error } = await q;
    if (error) throw error;
    const page = (data ?? []) as Array<Record<string, unknown>>;
    if (page.length === 0) break;

    for (const row of page) {
      const id = String(row.id ?? "");
      if (id && seen.has(id)) continue; // proteção contra sobreposição
      if (id) seen.add(id);
      rows.push(row);
      if (rows.length > cap) {
        throw new Error(`row_limit_exceeded:${scope}:${cap}`);
      }
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { columns: config.columns, rows };
}

function inferEmpresaId(
  vs: { filters?: { empresa_representada_id?: string } },
  rows: Array<Record<string, unknown>>,
): string | null {
  if (typeof vs.filters?.empresa_representada_id === "string") return vs.filters.empresa_representada_id;
  const fromRows = rows.find((row) => typeof row.empresa_representada_id === "string")?.empresa_representada_id;
  return typeof fromRows === "string" ? fromRows : null;
}

async function generateArtifact(
  format: "csv" | "xlsx" | "pdf",
  title: string,
  columns: string[],
  rows: Array<Record<string, unknown>>,
  branding: Branding | null,
): Promise<{ bytes: Uint8Array; contentType: string; ext: string }> {
  if (format === "csv") {
    return {
      bytes: exportCsvServer({ columns, rows }),
      contentType: "text/csv; charset=utf-8",
      ext: "csv",
    };
  }
  if (format === "xlsx") {
    return {
      bytes: await exportXlsxServer({ sheetName: title, columns, rows, branding }),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ext: "xlsx",
    };
  }
  return {
    bytes: await exportPdfServer({ title, columns, rows, branding }),
    contentType: "application/pdf",
    ext: "pdf",
  };
}

async function processSchedule(client: SupabaseClient, sch: ScheduleRow): Promise<void> {
  const plannedRunAt = new Date(sch.next_run_at);
  const idempotencyKey = buildIdempotencyKey(sch.id, plannedRunAt);

  // Determina attempt olhando runs anteriores para esta chave.
  const { data: prevRuns } = await client
    .from("report_schedule_runs")
    .select("id,attempt,status")
    .eq("idempotency_key", idempotencyKey)
    .order("attempt", { ascending: false })
    .limit(1);

  const lastAttempt = prevRuns && prevRuns.length > 0 ? Number(prevRuns[0].attempt) : 0;
  if (lastAttempt >= MAX_ATTEMPTS) {
    // Esgotou tentativas — avança next_run_at para não travar o schedule.
    const nextAt = computeNextRunAt({
      frequency: sch.frequency,
      hour: sch.hour_utc,
      minute: 0,
      day_of_week: sch.day_of_week,
      day_of_month: sch.day_of_month,
      reference: new Date(),
    });
    await client.from("report_schedules").update({ next_run_at: nextAt.toISOString() }).eq("id", sch.id);
    log("schedule_max_attempts_exhausted", { schedule_id: sch.id });
    return;
  }
  const attempt = lastAttempt + 1;

  // Cria run (ON CONFLICT skip via unique idempotency_key + attempt distinto).
  const { data: runRow, error: insertErr } = await client
    .from("report_schedule_runs")
    .insert({
      schedule_id: sch.id,
      user_id: sch.user_id,
      idempotency_key: `${idempotencyKey}#${attempt}`,
      attempt,
      status: "running",
      started_at: nowIso(),
    })
    .select("id")
    .maybeSingle();

  if (insertErr || !runRow) {
    log("run_insert_conflict", { schedule_id: sch.id, err: insertErr?.message });
    return;
  }
  const runId = runRow.id as string;

  // P5.3: orçamento total (timeout budget) por run via AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);
  const timeoutPromise = new Promise<never>((_, reject) => {
    controller.signal.addEventListener("abort", () => {
      reject(new Error("run_timeout:budget_exceeded"));
    });
  });

  const work = (async () => {
    const vs = validateViewState(sch.view_state);
    if (!vs.ok || !vs.data) throw new Error(`invalid_view_state:${vs.error}`);

    let scoped: { columns: string[]; rows: Array<Record<string, unknown>> };
    try {
      scoped = await loadScopeData(client, sch.scope, vs.data, sch.format, controller.signal);
    } catch (e) {
      const em = e instanceof Error ? e.message : String(e);
      // Preserva reasons canônicos vindos de loadScopeData (row_limit_exceeded / run_timeout).
      if (em.startsWith("row_limit_exceeded:") || em.startsWith("run_timeout:")) throw e;
      throw new Error(`scope_query_failed:${em}`);
    }

    const empresaId = inferEmpresaId(vs.data, scoped.rows);
    const brandingByEmpresa = await resolveBrandingForEmpresa(client, empresaId);
    const branding = brandingByEmpresa.logo || brandingByEmpresa.companyName
      ? brandingByEmpresa
      : await resolveBrandingForUser(client, sch.user_id);

    let artifact: { bytes: Uint8Array; ext: string; contentType: string };
    try {
      artifact = await generateArtifact(sch.format, sch.name, scoped.columns, scoped.rows, branding);
    } catch (e) {
      throw new Error(`artifact_generation_failed:${e instanceof Error ? e.message : String(e)}`);
    }

    const path = `${sch.user_id}/${sch.id}/${runId}.${artifact.ext}`;
    const { error: upErr } = await client.storage
      .from(BUCKET)
      .upload(path, artifact.bytes, { contentType: artifact.contentType, upsert: true });
    if (upErr) throw new Error(`upload_failed:${upErr.message}`);

    const { data: signed, error: signErr } = await client.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed) throw new Error(`sign_failed:${signErr?.message}`);

    const delivery = await activeProvider.send({
      runId,
      scheduleId: sch.id,
      userId: sch.user_id,
      scope: sch.scope,
      format: sch.format,
      signedUrl: signed.signedUrl,
      recipients: sch.recipients,
      scheduleName: sch.name,
      generatedAt: nowIso(),
    });

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

    await client
      .from("report_schedule_runs")
      .update({
        status: "succeeded",
        finished_at: nowIso(),
        artifact_path: path,
        signed_url: signed.signedUrl,
        signed_url_expires_at: expiresAt,
        delivery_status: delivery.status,
        delivery_message_id: delivery.messageId,
        delivery_reason: delivery.reason,
      })
      .eq("id", runId);

    const nextAt = computeNextRunAt({
      frequency: sch.frequency,
      hour: sch.hour_utc,
      minute: 0,
      day_of_week: sch.day_of_week,
      day_of_month: sch.day_of_month,
      reference: new Date(),
    });
    await client
      .from("report_schedules")
      .update({ last_run_at: nowIso(), next_run_at: nextAt.toISOString() })
      .eq("id", sch.id);

    log("run_succeeded", { schedule_id: sch.id, run_id: runId, attempt, rows: scoped.rows.length });
  })();

  try {
    await Promise.race([work, timeoutPromise]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const { reason, detail } = classifyReason(msg);
    // P5.3: row_limit_exceeded e invalid_view_state são definitivos (sem retry).
    // run_timeout mantém política transitória (retry com backoff).
    const isFinal = attempt >= MAX_ATTEMPTS || isDefinitive(reason);
    const normalized = `${reason}:${detail}`.slice(0, 500);

    await client
      .from("report_schedule_runs")
      .update({
        status: "failed",
        finished_at: nowIso(),
        error_message: normalized,
      })
      .eq("id", runId);

    if (isFinal) {
      const nextAt = computeNextRunAt({
        frequency: sch.frequency,
        hour: sch.hour_utc,
        minute: 0,
        day_of_week: sch.day_of_week,
        day_of_month: sch.day_of_month,
        reference: new Date(),
      });
      await client.from("report_schedules").update({ next_run_at: nextAt.toISOString() }).eq("id", sch.id);
    } else {
      const retryAt = new Date(Date.now() + backoffDelayMs(attempt)).toISOString();
      await client.from("report_schedules").update({ next_run_at: retryAt }).eq("id", sch.id);
    }
    log("run_failed", { schedule_id: sch.id, run_id: runId, attempt, final: isFinal, reason });
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isInternalRequest(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "missing_env" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await client
      .from("report_schedules")
      .select("id,user_id,name,scope,format,frequency,hour_utc,day_of_week,day_of_month,next_run_at,recipients,view_state,enabled")
      .eq("enabled", true)
      .lte("next_run_at", nowIso())
      .order("next_run_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (error) throw error;
    const schedules = (data ?? []) as ScheduleRow[];
    log("batch_started", { count: schedules.length });

    for (const sch of schedules) {
      await processSchedule(client, sch);
    }

    return new Response(JSON.stringify({ ok: true, processed: schedules.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("batch_error", { error: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
