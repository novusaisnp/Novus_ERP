// P5.1 + P6.2 + P6.4 — Página operacional (admin) para monitorar runs de report_schedules.
// Gate: apenas novus_owner. report_schedules/report_ops_* não têm coluna de
// empresa — é operação interna NOVUS, não dado de cliente (AUDITORIA_NOVA
// Fase 1.5) — por isso não usa o 'admin' escopado por empresa.
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { checkHasRole } from "@/utils/authUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KpiCards } from "@/components/relatorios/ops/KpiCards";
import { RunsFailuresTable } from "@/components/relatorios/ops/RunsFailuresTable";
import { AlertsDrawer } from "@/components/relatorios/ops/AlertsDrawer";
import { OpsFilters } from "@/components/relatorios/ops/OpsFilters";
import {
  useReportRunFailures24h,
  useReportRunKpis24h,
  useReportRuns,
} from "@/hooks/useReportRunKpis";
import type { RunsFilter } from "@/services/reportRunOpsService";
import { useOpsFilters, windowToHours } from "@/hooks/useOpsFilters";
import { downloadDiagnosticCsv } from "@/utils/exportOpsDiagnostic";
import { listOpsAlerts } from "@/services/opsAlertsService";
import { toast } from "@/components/ui/use-toast";

const ALL = "__all__";

const RelatoriosOps: React.FC = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading: loadingRole } = useQuery({
    queryKey: ["is-novus-owner", user?.id ?? null],
    enabled: !!user?.id,
    queryFn: () => checkHasRole(user!.id, "novus_owner"),
    staleTime: 60_000,
  });

  const { filters, patch, reset } = useOpsFilters(user?.id ?? null);

  const [status, setStatus] = useState<RunsFilter["status"]>(null);
  const [scheduleId, setScheduleId] = useState<string>("");

  const runsFilter = useMemo<RunsFilter>(
    () => ({
      hours: windowToHours(filters.window),
      status,
      reason: filters.reason,
      scheduleId: scheduleId.trim() || null,
      limit: 200,
    }),
    [filters.window, filters.reason, status, scheduleId],
  );

  const kpis = useReportRunKpis24h();
  const failures = useReportRunFailures24h();
  const runs = useReportRuns(runsFilter);

  const failuresFiltered = useMemo(() => {
    const list = failures.data ?? [];
    if (!filters.reason) return list;
    return list.filter((r) => r.reason === filters.reason);
  }, [failures.data, filters.reason]);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    try {
      setExporting(true);
      const openAlerts = await listOpsAlerts({ onlyOpen: true, limit: 200 });
      downloadDiagnosticCsv({
        kpis: kpis.data ?? [],
        failures: failuresFiltered,
        openAlerts,
      });
    } catch (e) {
      toast({
        title: "Falha ao exportar diagnóstico",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

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
            KPIs, alertas e diagnóstico. Dados restritos a administradores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AlertsDrawer />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exportando…" : "Exportar diagnóstico"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { kpis.refetch(); failures.refetch(); runs.refetch(); }}>
            Atualizar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <OpsFilters value={filters} onChange={patch} onReset={reset} />
        </CardContent>
      </Card>

      <KpiCards data={kpis.data} isLoading={kpis.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Falhas por reason (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {failures.isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : failuresFiltered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border rounded-md">
              Sem falhas para o filtro atual.
            </div>
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
                  {failuresFiltered.map((r) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
