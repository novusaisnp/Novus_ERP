// P6.4 — UI compacta de filtros salvos para RelatoriosOps.
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { OpsFiltersState, OpsWindow, OpsAlertStatusFilter } from "@/hooks/useOpsFilters";

const ALL = "__all__";

const REASONS = [
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

interface Props {
  value: OpsFiltersState;
  onChange: (patch: Partial<OpsFiltersState>) => void;
  onReset: () => void;
}

export const OpsFilters: React.FC<Props> = ({ value, onChange, onReset }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Janela</label>
        <Select
          value={value.window}
          onValueChange={(v) => onChange({ window: v as OpsWindow })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Reason (falhas)</label>
        <Select
          value={value.reason ?? ALL}
          onValueChange={(v) => onChange({ reason: v === ALL ? null : v })}
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
        <label className="text-xs text-muted-foreground">Alertas</label>
        <Select
          value={value.alertStatus}
          onValueChange={(v) => onChange({ alertStatus: v as OpsAlertStatusFilter })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Limpar filtros
        </Button>
      </div>
    </div>
  );
};
