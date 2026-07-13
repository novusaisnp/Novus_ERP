// P6.3 — Serviço de auditoria operacional (frontend ops).
// Leitura via RLS (admin lê tudo; usuário comum lê apenas próprias linhas).
// Escrita ocorre exclusivamente via edge functions (service_role).
import { supabase } from "@/integrations/supabase/client";

export type OpsAuditAction = "resign" | "probe_run" | "alert_ack";

export interface OpsAuditRow {
  id: string;
  action: OpsAuditAction;
  actor_user_id: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ListOpsAuditParams {
  action?: OpsAuditAction;
  actorUserId?: string;
  limit?: number;
  since?: string;
}

export async function listOpsAudit(
  params: ListOpsAuditParams = {},
): Promise<OpsAuditRow[]> {
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 500);
  let query = supabase
    .from("report_ops_audit")
    .select("id, action, actor_user_id, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.action) query = query.eq("action", params.action);
  if (params.actorUserId) query = query.eq("actor_user_id", params.actorUserId);
  if (params.since) query = query.gte("created_at", params.since);

  const { data, error } = await query;
  if (error) {
    throw new Error("Não foi possível carregar a auditoria.");
  }
  return (data ?? []) as OpsAuditRow[];
}

/**
 * Stub seguro para P6.2. A gravação real de probe_run acontecerá via edge
 * function (service_role); mantido aqui como no-op para não quebrar imports.
 */
export async function createProbeRunAudit(
  _metadata: Record<string, unknown> = {},
): Promise<void> {
  // no-op: implementado em P6.2 via edge function.
}
