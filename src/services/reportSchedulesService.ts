import { supabase } from "@/integrations/supabase/client";
import {
  clientNextRunAt,
  parseRun,
  parseSchedule,
  type ReportSchedule,
  type ReportScheduleInput,
  type ReportScheduleRun,
  type ReportScheduleScope,
} from "@/types/reportSchedule";

// Mapeia erros do backend para mensagens amigáveis (sem vazar detalhes internos).
function friendlyError(err: unknown, fallback: string): Error {
  const message = err instanceof Error ? err.message : String(err ?? "");
  if (/row-level security|permission|not authorized/i.test(message)) {
    return new Error("Você não tem permissão para esta operação.");
  }
  if (/duplicate|unique/i.test(message)) {
    return new Error("Registro duplicado.");
  }
  if (/violates check|check constraint/i.test(message)) {
    return new Error("Dados inválidos para agendamento.");
  }
  return new Error(fallback);
}

export const reportSchedulesService = {
  async listSchedules(scope: ReportScheduleScope): Promise<ReportSchedule[]> {
    const { data, error } = await supabase
      .from("report_schedules")
      .select("*")
      .eq("scope", scope)
      .order("created_at", { ascending: false });
    if (error) throw friendlyError(error, "Falha ao listar agendamentos.");
    return (data ?? []).map((r) => parseSchedule(r as Record<string, unknown>));
  },

  async createSchedule(payload: ReportScheduleInput): Promise<ReportSchedule> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("Usuário não autenticado.");

    const nextRunAt = clientNextRunAt({
      frequency: payload.frequency,
      hour_utc: payload.hour_utc,
      day_of_week: payload.day_of_week,
      day_of_month: payload.day_of_month,
    }).toISOString();

    const { data, error } = await supabase
      .from("report_schedules")
      .insert({
        user_id: userId,
        name: payload.name.trim(),
        scope: payload.scope,
        format: payload.format,
        frequency: payload.frequency,
        hour_utc: payload.hour_utc,
        day_of_week: payload.day_of_week,
        day_of_month: payload.day_of_month,
        recipients: payload.recipients,
        view_state: payload.view_state as unknown as never,
        enabled: payload.enabled,
        next_run_at: nextRunAt,
      })
      .select("*")
      .single();
    if (error || !data) throw friendlyError(error, "Falha ao criar agendamento.");
    return parseSchedule(data as Record<string, unknown>);
  },

  async updateSchedule(id: string, patch: Partial<ReportScheduleInput>): Promise<ReportSchedule> {
    // Update tipado permissivamente para permitir campos opcionais e next_run_at recalculado.
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.format !== undefined) update.format = patch.format;
    if (patch.frequency !== undefined) update.frequency = patch.frequency;
    if (patch.hour_utc !== undefined) update.hour_utc = patch.hour_utc;
    if (patch.day_of_week !== undefined) update.day_of_week = patch.day_of_week;
    if (patch.day_of_month !== undefined) update.day_of_month = patch.day_of_month;
    if (patch.recipients !== undefined) update.recipients = patch.recipients;
    if (patch.view_state !== undefined) update.view_state = patch.view_state;
    if (patch.enabled !== undefined) update.enabled = patch.enabled;

    // Recalcula next_run_at se schedule/hora mudaram
    if (
      patch.frequency !== undefined ||
      patch.hour_utc !== undefined ||
      patch.day_of_week !== undefined ||
      patch.day_of_month !== undefined
    ) {
      const { data: current } = await supabase
        .from("report_schedules")
        .select("frequency,hour_utc,day_of_week,day_of_month")
        .eq("id", id)
        .maybeSingle();
      if (current) {
        update.next_run_at = clientNextRunAt({
          frequency: (patch.frequency ?? current.frequency) as ReportScheduleInput["frequency"],
          hour_utc: patch.hour_utc ?? current.hour_utc,
          day_of_week: patch.day_of_week ?? current.day_of_week,
          day_of_month: patch.day_of_month ?? current.day_of_month,
        }).toISOString();
      }
    }

    const { data, error } = await supabase
      .from("report_schedules")
      .update(update as never)
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) throw friendlyError(error, "Falha ao atualizar agendamento.");
    return parseSchedule(data as Record<string, unknown>);
  },

  async toggleSchedule(id: string, enabled: boolean): Promise<ReportSchedule> {
    return this.updateSchedule(id, { enabled });
  },

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await supabase.from("report_schedules").delete().eq("id", id);
    if (error) throw friendlyError(error, "Falha ao excluir agendamento.");
  },

  async listRuns(scheduleId: string, limit = 20): Promise<ReportScheduleRun[]> {
    const { data, error } = await supabase
      .from("report_schedule_runs")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw friendlyError(error, "Falha ao listar execuções.");
    return (data ?? []).map((r) => parseRun(r as Record<string, unknown>));
  },

  // P5.2 — regenera signed URL de um run já concluído (não reprocessa export).
  async resignRun(runId: string, ttlSeconds?: number): Promise<{
    run_id: string;
    signed_url: string;
    signed_url_expires_at: string;
    resign_count: number;
    resigned_at: string;
  }> {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Entre novamente.");

    const { data, error } = await supabase.functions.invoke("resign-report-run", {
      body: { run_id: runId, ttl_seconds: ttlSeconds },
    });

    if (error) {
      // supabase-js encapsula o body do erro; tenta extrair reason
      const ctx = (error as unknown as { context?: { body?: unknown } }).context;
      let reason: string | undefined;
      try {
        const raw = typeof ctx?.body === "string" ? ctx.body : "";
        if (raw) reason = (JSON.parse(raw) as { reason?: string }).reason;
      } catch {
        reason = undefined;
      }
      throw new Error(resignFriendlyMessage(reason ?? error.message));
    }
    if (!data || (data as { ok?: boolean }).ok === false) {
      const reason = (data as { reason?: string } | null)?.reason;
      throw new Error(resignFriendlyMessage(reason));
    }
    return data as {
      run_id: string;
      signed_url: string;
      signed_url_expires_at: string;
      resign_count: number;
      resigned_at: string;
    };
  },
};

function resignFriendlyMessage(reason: string | undefined): string {
  switch (reason) {
    case "not_owner":
    case "not_admin":
      return "Você não tem permissão para regenerar este link.";
    case "run_missing":
      return "Execução não encontrada.";
    case "artifact_missing":
      return "O arquivo desta execução não está disponível.";
    case "run_not_succeeded":
      return "Só é possível regenerar link de execuções concluídas.";
    case "ttl_out_of_range":
      return "Duração de expiração inválida.";
    case "rate_limited":
      return "Limite diário de regenerações atingido para esta execução.";
    case "missing_auth":
      return "Sessão expirada. Entre novamente.";
    case "invalid_run_id":
      return "Identificador de execução inválido.";
    default:
      return "Falha ao regenerar link.";
  }
}
