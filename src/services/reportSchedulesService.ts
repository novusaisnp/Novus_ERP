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
        view_state: payload.view_state as unknown as Record<string, unknown>,
        enabled: payload.enabled,
        next_run_at: nextRunAt,
      })
      .select("*")
      .single();
    if (error || !data) throw friendlyError(error, "Falha ao criar agendamento.");
    return parseSchedule(data as Record<string, unknown>);
  },

  async updateSchedule(id: string, patch: Partial<ReportScheduleInput>): Promise<ReportSchedule> {
    // deno-lint-ignore no-explicit-any
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.format !== undefined) update.format = patch.format;
    if (patch.frequency !== undefined) update.frequency = patch.frequency;
    if (patch.hour_utc !== undefined) update.hour_utc = patch.hour_utc;
    if (patch.day_of_week !== undefined) update.day_of_week = patch.day_of_week;
    if (patch.day_of_month !== undefined) update.day_of_month = patch.day_of_month;
    if (patch.recipients !== undefined) update.recipients = patch.recipients;
    if (patch.view_state !== undefined) update.view_state = patch.view_state as unknown as Record<string, unknown>;
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
      .update(update)
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
};
