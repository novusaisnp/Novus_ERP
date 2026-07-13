// P6.2 — Drawer de alertas operacionais (admin).
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useAckOpsAlert,
  useOpenOpsAlertCount,
  useOpsAlerts,
} from "@/hooks/useOpsAlerts";
import type { OpsAlertRow } from "@/services/opsAlertsService";
import { toast } from "@/components/ui/use-toast";

const FRIENDLY_REASON: Record<string, string> = {
  heartbeat_stale: "Cron parado há mais de 15 min",
  heartbeat_slow: "Cron com atraso (>5 min)",
  storage_rate_warning: "Erros de storage acima de 5% na última hora",
  storage_rate_page: "Erros de storage acima de 20% na última hora",
  stuck_runs_warning: "Runs presos em execução",
  stuck_runs_page: "Muitos runs presos em execução",
  resign_warning: "Runs próximos do limite de resign",
  resign_page: "Runs atingiram o limite de resign",
  behind_warning: "Schedules atrasados",
  behind_page: "Schedules muito atrasados",
};

function friendly(reason: string): string {
  if (FRIENDLY_REASON[reason]) return FRIENDLY_REASON[reason];
  if (reason.startsWith("spike_warning:")) {
    return `Alta de falhas: ${reason.split(":")[1]}`;
  }
  if (reason.startsWith("spike_page:")) {
    return `Pico crítico de falhas: ${reason.split(":")[1]}`;
  }
  return reason;
}

const SeverityBadge: React.FC<{ severity: OpsAlertRow["severity"] }> = ({ severity }) => (
  <Badge variant={severity === "page" ? "destructive" : "secondary"} className="uppercase">
    {severity}
  </Badge>
);

export const AlertsDrawer: React.FC = () => {
  const openCountQ = useOpenOpsAlertCount();
  const listQ = useOpsAlerts(false);
  const ack = useAckOpsAlert();

  const openCount = openCountQ.data ?? 0;

  const handleAck = (id: string) => {
    ack.mutate(id, {
      onSuccess: () => toast({ title: "Alerta reconhecido." }),
      onError: (e) =>
        toast({
          title: "Falha ao reconhecer.",
          description: (e as Error).message,
          variant: "destructive",
        }),
    });
  };

  const rows = listQ.data ?? [];
  const abertos = rows.filter((r) => !r.resolved_at);
  const recentes = rows.filter((r) => r.resolved_at).slice(0, 20);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Abrir alertas operacionais">
          Alertas
          {openCount > 0 && (
            <Badge variant="destructive" className="ml-2" data-testid="alerts-badge">
              {openCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Alertas operacionais</SheetTitle>
          <SheetDescription>
            Baseados nas health probes. Reconhecer registra a ação em auditoria.
          </SheetDescription>
        </SheetHeader>

        <section className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold">Abertos ({abertos.length})</h3>
          {abertos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta aberto.</p>
          ) : (
            <ul className="space-y-2" data-testid="alerts-open-list">
              {abertos.map((a) => (
                <li key={a.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={a.severity} />
                    <time className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-sm font-medium">{friendly(a.reason)}</p>
                  <p className="text-xs text-muted-foreground font-mono">{a.kind}</p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ack.isPending}
                      onClick={() => handleAck(a.id)}
                    >
                      Reconhecer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold">Resolvidos recentes</h3>
          {recentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada por aqui.</p>
          ) : (
            <ul className="space-y-2">
              {recentes.map((a) => (
                <li key={a.id} className="border rounded-md p-2 opacity-70">
                  <div className="flex items-center justify-between gap-2">
                    <SeverityBadge severity={a.severity} />
                    <time className="text-xs text-muted-foreground">
                      {a.resolved_at ? new Date(a.resolved_at).toLocaleString() : ""}
                    </time>
                  </div>
                  <p className="text-sm">{friendly(a.reason)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
};

export default AlertsDrawer;
