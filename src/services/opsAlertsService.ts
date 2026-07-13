// P6.2 — Serviço de alertas operacionais (frontend admin).
// Leitura via RLS (admin). Ack: UPDATE em report_ops_alerts + audit alert_ack.
import { supabase } from "@/integrations/supabase/client";

export type AlertSeverity = "warning" | "page";

export interface OpsAlertRow {
  id: string;
  kind: string;
  severity: AlertSeverity;
  reason: string;
  payload: Record<string, unknown>;
  acknowledged_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListOpsAlertsParams {
  onlyOpen?: boolean;
  limit?: number;
}

export async function listOpsAlerts(
  params: ListOpsAlertsParams = {},
): Promise<OpsAlertRow[]> {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
  let q = supabase
    .from("report_ops_alerts")
    .select(
      "id, kind, severity, reason, payload, acknowledged_by, resolved_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (params.onlyOpen) q = q.is("resolved_at", null);
  const { data, error } = await q;
  if (error) throw new Error("Não foi possível carregar os alertas.");
  return (data ?? []) as OpsAlertRow[];
}

export async function countOpenOpsAlerts(): Promise<number> {
  const { count, error } = await supabase
    .from("report_ops_alerts")
    .select("id", { count: "exact", head: true })
    .is("resolved_at", null);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Reconhece um alerta. Admin marca `acknowledged_by=userId`; alertas warning são
 * resolvidos de imediato (ruído baixo); page permanece aberto para follow-up.
 * Também registra 1 linha em `report_ops_audit` (action='alert_ack').
 */
export async function ackOpsAlert(alertId: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error("Sessão expirada.");

  const { data: alertRow, error: readErr } = await supabase
    .from("report_ops_alerts")
    .select("id, severity, kind, reason, resolved_at")
    .eq("id", alertId)
    .maybeSingle();
  if (readErr || !alertRow) throw new Error("Alerta não encontrado.");

  const patch: Record<string, unknown> = { acknowledged_by: userId };
  if (alertRow.severity === "warning" && !alertRow.resolved_at) {
    patch.resolved_at = new Date().toISOString();
  }

  const { error: updErr } = await supabase
    .from("report_ops_alerts")
    .update(patch)
    .eq("id", alertId);
  if (updErr) throw new Error("Falha ao reconhecer alerta.");

  const { error: auditErr } = await supabase.from("report_ops_audit").insert({
    action: "alert_ack",
    actor_user_id: userId,
    target_id: alertId,
    metadata: {
      kind: alertRow.kind,
      reason: alertRow.reason,
      severity: alertRow.severity,
      auto_resolved: alertRow.severity === "warning",
    },
  });
  if (auditErr) {
    // best-effort: não bloqueia a UX se auditoria falhar.
    console.warn("audit_alert_ack_failed", auditErr.message);
  }
}
