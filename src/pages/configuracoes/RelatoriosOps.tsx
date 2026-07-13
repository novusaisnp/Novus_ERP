// P5.1 — Página operacional (admin) para monitorar runs de report_schedules.
// Gate: apenas usuários com role 'admin'. Não-admin veem aviso e nenhum dado.
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCards } from "@/components/relatorios/ops/KpiCards";
import { RunsFailuresTable } from "@/components/relatorios/ops/RunsFailuresTable";
import { AlertsDrawer } from "@/components/relatorios/ops/AlertsDrawer";
import {
  useReportRunFailures24h,
  useReportRunKpis24h,
  useReportRuns,
} from "@/hooks/useReportRunKpis";
import type { RunsFilter } from "@/services/reportRunOpsService";

const ALL = "__all__";
const REASONS: string[] = [
  "invalid_view_state",
  "scope_query_failed",
  "row_limit_exceeded",
  "run_timeout",
  "artifact_generation_failed",
  "upload_failed",
  "sign_failed",
  "delivery_skipped",
  "unknown",
];

const RelatoriosOps: React.FC = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading: loadingRole } = useQuery({
    queryKey: ["is-admin", user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) return false;
      return Boolean(data);
    },
    staleTime: 60_000,
  });

  const [hours, setHours] = useState<number>(24);
  const [status, setStatus] = useState<RunsFilter["status"]>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string>("");

  const filter = useMemo<RunsFilter>(
    () => ({
      hours,
      status,
      reason,
      scheduleId: scheduleId.trim() || null,
      limit: 200,
    }),
    [hours, status, reason, scheduleId],
  );

  const kpis = useReportRunKpis24h();
  const failures = useReportRunFailures24h();
  const runs = useReportRuns(filter);

  if (loadingRole) {
    return (
      <div className="p-6 text-sm text-muted-foreground" aria-busy="true">
        Verificando permissões…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Operações de relatórios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Acesso restrito a administradores.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Operações — Relatórios agendados</h1>
          <p className="text-sm text-muted-foreground">
            KPIs e diagnóstico em janela de 24h. Dados restritos a administradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertsDrawer />
          <Button variant="outline" size="sm" onClick={() => { kpis.refetch(); failures.refetch(); runs.refetch(); }}>
            Atualizar
          </Button>
        </div>
      </header>

      <KpiCards data={kpis.data} isLoading={kpis.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Falhas por reason (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {failures.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : (failures.data ?? []).length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem falhas nas últimas 24h.</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Reason</th>
                    <th className="text-left px-3 py-2">Scope</th>
                    <th className="text-left px-3 py-2">Format</th>
                    <th className="text-left px-3 py-2">Falhas</th>
                    <th className="text-left px-3 py-2">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {(failures.data ?? []).map((r) => (
                    <tr key={`${r.reason}-${r.scope}-${r.format}`} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{r.reason}</td>
                      <td className="px-3 py-2">{r.scope}</td>
                      <td className="px-3 py-2">{r.format}</td>
                      <td className="px-3 py-2">{r.failures}</td>
                      <td className="px-3 py-2">{new Date(r.last_seen_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Janela (horas)</label>
              <Input
                type="number"
                min={1}
                max={168}
                value={hours}
                onChange={(e) => setHours(Math.max(1, Math.min(168, Number(e.target.value) || 24)))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select
                value={status ?? ALL}
                onValueChange={(v) => setStatus(v === ALL ? null : (v as RunsFilter["status"]))}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="succeeded">succeeded</SelectItem>
                  <SelectItem value="failed">failed</SelectItem>
                  <SelectItem value="running">running</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reason</label>
              <Select
                value={reason ?? ALL}
                onValueChange={(v) => setReason(v === ALL ? null : v)}
              >
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Schedule ID (drill)</label>
              <Input
                placeholder="UUID do schedule"
                value={scheduleId}
                onChange={(e) => setScheduleId(e.target.value)}
              />
            </div>
          </div>
          <RunsFailuresTable
            rows={runs.data}
            isLoading={runs.isLoading}
            onSelectSchedule={(id) => setScheduleId(id)}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatoriosOps;
