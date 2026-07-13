// Tipos do frontend para agendamento de relatórios (P4.2A - sub-onda 2B).
// Alinhados ao contrato do backend em supabase/functions/_shared/report-export/validateViewState.ts.

export type ReportScheduleFrequency = "daily" | "weekly" | "monthly";
export type ReportScheduleScope = "vendas" | "financeiro";
export type ReportExportFormat = "csv" | "xlsx" | "pdf";
export type ReportRunStatus = "pending" | "running" | "succeeded" | "failed";
export type ReportDeliveryStatus = "sent" | "skipped" | "failed" | null;

// View state persistido no schedule. schema_version=1 é o único aceito pelo backend.
export interface ReportScheduleViewStateV1 {
  schema_version: 1;
  scope: ReportScheduleScope;
  filters: {
    date_from?: string;
    date_to?: string;
    status?: string[];
    empresa_representada_id?: string;
    search?: string;
  };
  group_by?: string[];
  sort?: Array<{ field: string; dir: "asc" | "desc" }>;
  columns?: string[];
}

export interface ReportSchedule {
  id: string;
  user_id: string;
  name: string;
  scope: ReportScheduleScope;
  format: ReportExportFormat;
  frequency: ReportScheduleFrequency;
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  next_run_at: string;
  last_run_at: string | null;
  recipients: string[];
  view_state: ReportScheduleViewStateV1;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportScheduleRun {
  id: string;
  schedule_id: string;
  user_id: string;
  idempotency_key: string;
  attempt: number;
  status: ReportRunStatus;
  started_at: string;
  finished_at: string | null;
  artifact_path: string | null;
  signed_url: string | null;
  signed_url_expires_at: string | null;
  delivery_status: ReportDeliveryStatus;
  delivery_message_id: string | null;
  delivery_reason: string | null;
  error_message: string | null;
  created_at: string;
  // P5.2 — auditoria de resign
  resigned_at: string | null;
  resigned_by: string | null;
  resign_count: number;
}

// Payload aceito por createSchedule / updateSchedule (o backend preenche id/user_id/next_run_at defaults).
export interface ReportScheduleInput {
  name: string;
  scope: ReportScheduleScope;
  format: ReportExportFormat;
  frequency: ReportScheduleFrequency;
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  recipients: string[];
  view_state: ReportScheduleViewStateV1;
  enabled: boolean;
}

// Normaliza um view_state possivelmente amplo (usado pelas páginas P1-P3) para o contrato v1 aceito pelo backend.
export function normalizeViewState(
  scope: ReportScheduleScope,
  input: Record<string, unknown> | null | undefined,
): ReportScheduleViewStateV1 {
  const raw = input ?? {};
  const filters: ReportScheduleViewStateV1["filters"] = {};

  const dataInicio = typeof raw.dataInicio === "string" ? raw.dataInicio : "";
  const dataFim = typeof raw.dataFim === "string" ? raw.dataFim : "";
  if (dataInicio) filters.date_from = new Date(`${dataInicio}T00:00:00.000Z`).toISOString();
  if (dataFim) filters.date_to = new Date(`${dataFim}T23:59:59.999Z`).toISOString();

  const status = raw.status;
  if (typeof status === "string" && status !== "TODOS") filters.status = [status];
  else if (Array.isArray(status) && status.length > 0) filters.status = status.filter((v) => typeof v === "string");

  const group: string[] = [];
  if (typeof raw.agrupamento === "string" && raw.agrupamento !== "nenhum") group.push(raw.agrupamento);

  return {
    schema_version: 1,
    scope,
    filters,
    ...(group.length > 0 ? { group_by: group } : {}),
  };
}

// Parser defensivo de row do banco -> ReportSchedule. Descarta view_state inválido.
export function parseSchedule(row: Record<string, unknown>): ReportSchedule {
  const vs = row.view_state as Record<string, unknown> | null;
  const scope = (row.scope as ReportScheduleScope) ?? "vendas";
  const parsedVs: ReportScheduleViewStateV1 =
    vs && typeof vs === "object" && (vs as { schema_version?: unknown }).schema_version === 1
      ? ((vs as unknown) as ReportScheduleViewStateV1)
      : { schema_version: 1, scope, filters: {} };

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name ?? ""),
    scope,
    format: (row.format as ReportExportFormat) ?? "csv",
    frequency: (row.frequency as ReportScheduleFrequency) ?? "daily",
    hour_utc: Number(row.hour_utc ?? 8),
    day_of_week: row.day_of_week == null ? null : Number(row.day_of_week),
    day_of_month: row.day_of_month == null ? null : Number(row.day_of_month),
    next_run_at: String(row.next_run_at),
    last_run_at: (row.last_run_at as string | null) ?? null,
    recipients: Array.isArray(row.recipients) ? (row.recipients as string[]) : [],
    view_state: parsedVs,
    enabled: Boolean(row.enabled),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function parseRun(row: Record<string, unknown>): ReportScheduleRun {
  return {
    id: String(row.id),
    schedule_id: String(row.schedule_id),
    user_id: String(row.user_id),
    idempotency_key: String(row.idempotency_key),
    attempt: Number(row.attempt ?? 1),
    status: (row.status as ReportRunStatus) ?? "pending",
    started_at: String(row.started_at),
    finished_at: (row.finished_at as string | null) ?? null,
    artifact_path: (row.artifact_path as string | null) ?? null,
    signed_url: (row.signed_url as string | null) ?? null,
    signed_url_expires_at: (row.signed_url_expires_at as string | null) ?? null,
    delivery_status: (row.delivery_status as ReportDeliveryStatus) ?? null,
    delivery_message_id: (row.delivery_message_id as string | null) ?? null,
    delivery_reason: (row.delivery_reason as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at),
    resigned_at: (row.resigned_at as string | null) ?? null,
    resigned_by: (row.resigned_by as string | null) ?? null,
    resign_count: Number(row.resign_count ?? 0),
  };
}

// Cálculo do próximo next_run_at no cliente — usado no create/update para não deixar em branco.
// Espelha computeNextRunAt do backend (UTC).
export function clientNextRunAt(input: {
  frequency: ReportScheduleFrequency;
  hour_utc: number;
  day_of_week: number | null;
  day_of_month: number | null;
  reference?: Date;
}): Date {
  const ref = input.reference ?? new Date();
  if (input.frequency === "daily") {
    const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), input.hour_utc, 0, 0, 0));
    if (next.getTime() <= ref.getTime()) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  if (input.frequency === "weekly") {
    const targetDow = input.day_of_week ?? 1;
    const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), input.hour_utc, 0, 0, 0));
    let diff = (targetDow - next.getUTCDay() + 7) % 7;
    if (diff === 0 && next.getTime() <= ref.getTime()) diff = 7;
    next.setUTCDate(next.getUTCDate() + diff);
    return next;
  }
  const targetDom = Math.min(Math.max(input.day_of_month ?? 1, 1), 28);
  const next = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), targetDom, input.hour_utc, 0, 0, 0));
  if (next.getTime() <= ref.getTime()) next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

// Validação de e-mail simples e conservadora — evita ReDoS.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ScheduleValidation {
  ok: boolean;
  errors: Record<string, string>;
}

export function validateScheduleInput(input: Partial<ReportScheduleInput>): ScheduleValidation {
  const errors: Record<string, string> = {};

  const name = (input.name ?? "").trim();
  if (!name) errors.name = "Nome é obrigatório";
  else if (name.length > 120) errors.name = "Nome deve ter até 120 caracteres";

  if (!input.frequency) errors.frequency = "Frequência é obrigatória";
  if (input.frequency === "weekly" && (input.day_of_week == null || input.day_of_week < 0 || input.day_of_week > 6)) {
    errors.day_of_week = "Selecione um dia da semana (0-6)";
  }
  if (input.frequency === "monthly" && (input.day_of_month == null || input.day_of_month < 1 || input.day_of_month > 28)) {
    errors.day_of_month = "Selecione um dia entre 1 e 28";
  }
  if (input.hour_utc == null || input.hour_utc < 0 || input.hour_utc > 23) {
    errors.hour_utc = "Hora inválida";
  }
  const recipients = input.recipients ?? [];
  if (recipients.length > 5) {
    errors.recipients = "Até 5 destinatários";
  } else {
    for (const r of recipients) {
      if (!EMAIL_RE.test(r) || r.length > 254) {
        errors.recipients = "E-mail inválido em destinatários";
        break;
      }
    }
  }
  if (!input.view_state || input.view_state.schema_version !== 1) {
    errors.view_state = "Configuração de visão inválida (schema_version)";
  }

  return { ok: Object.keys(errors).length === 0, errors };
}
