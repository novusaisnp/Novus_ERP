// P5.1 — Tabela de runs falhas/execuções com filtros básicos.
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportRunListItem } from "@/services/reportRunOpsService";

interface Props {
  rows: ReportRunListItem[] | undefined;
  isLoading: boolean;
  onSelectSchedule?: (scheduleId: string) => void;
}

function reasonOf(msg: string | null): string {
  if (!msg) return "—";
  const p = msg.split(":")[0].trim();
  return p || "unknown";
}

function durationMs(start: string, end: string | null): string {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  return `${(ms / 1000).toFixed(2)} s`;
}

const StatusBadge: React.FC<{ status: ReportRunListItem["status"] }> = ({ status }) => {
  if (status === "succeeded") return <Badge variant="secondary">succeeded</Badge>;
  if (status === "failed") return <Badge variant="destructive">failed</Badge>;
  return <Badge>running</Badge>;
};

export const RunsFailuresTable: React.FC<Props> = ({ rows, isLoading, onSelectSchedule }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  const list = rows ?? [];
  if (list.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center border rounded-md">
        Nenhum run encontrado para o filtro atual.
      </div>
    );
  }
  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2">Início</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">Reason</th>
            <th className="text-left px-3 py-2">Tentativa</th>
            <th className="text-left px-3 py-2">Duração</th>
            <th className="text-left px-3 py-2">Schedule</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id} className="border-t hover:bg-muted/20">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString()}</td>
              <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-2">{r.status === "failed" ? reasonOf(r.error_message) : "—"}</td>
              <td className="px-3 py-2">{r.attempt}</td>
              <td className="px-3 py-2">{durationMs(r.started_at, r.finished_at)}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  className="text-primary hover:underline font-mono text-xs"
                  onClick={() => onSelectSchedule?.(r.schedule_id)}
                  title={r.schedule_id}
                >
                  {r.schedule_id.slice(0, 8)}…
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
