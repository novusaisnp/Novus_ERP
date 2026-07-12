import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarClock, Download, ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react";
import { useReportSchedules } from "@/hooks/useReportSchedules";
import { ScheduleModal } from "@/components/relatorios/ScheduleModal";
import {
  type ReportSchedule,
  type ReportScheduleInput,
  type ReportScheduleRun,
  type ReportScheduleScope,
  type ReportScheduleViewStateV1,
} from "@/types/reportSchedule";

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  running: { label: "Executando", variant: "secondary" },
  succeeded: { label: "Concluído", variant: "default" },
  failed: { label: "Falhou", variant: "destructive" },
};

export function statusBadge(status: string) {
  return STATUS_BADGE[status] ?? { label: status, variant: "outline" as const };
}

export interface ScheduleListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ReportScheduleScope;
  viewState: ReportScheduleViewStateV1;
}

export function ScheduleList({ open, onOpenChange, scope, viewState }: ScheduleListProps) {
  const { schedules, loading, error, create, update, toggle, remove, listRuns, refetch } = useReportSchedules(scope);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ReportSchedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ReportSchedule | null>(null);
  const [openedRuns, setOpenedRuns] = useState<Record<string, ReportScheduleRun[] | "loading" | undefined>>({});

  useEffect(() => {
    if (open) void refetch();
  }, [open, refetch]);

  const openEditor = (sch: ReportSchedule | null) => {
    setEditing(sch);
    setEditorOpen(true);
  };

  const handleSubmit = useCallback(
    async (payload: ReportScheduleInput, id?: string) => {
      if (id) await update(id, payload);
      else await create(payload);
    },
    [create, update],
  );

  const loadRuns = async (sch: ReportSchedule) => {
    setOpenedRuns((prev) => ({ ...prev, [sch.id]: "loading" }));
    try {
      const runs = await listRuns(sch.id, 20);
      setOpenedRuns((prev) => ({ ...prev, [sch.id]: runs }));
    } catch {
      setOpenedRuns((prev) => ({ ...prev, [sch.id]: [] }));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Agendamentos de Relatório
            </DialogTitle>
            <DialogDescription>
              Gere e envie relatórios recorrentes com a configuração atual.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? "Carregando…" : `${schedules.length} agendamento(s)`}
            </p>
            <Button size="sm" onClick={() => openEditor(null)}>Novo</Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {schedules.map((sch) => {
              const runs = openedRuns[sch.id];
              const isLoadingRuns = runs === "loading";
              const runsList = Array.isArray(runs) ? runs : [];
              return (
                <div key={sch.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {FREQUENCY_LABEL[sch.frequency]} · {sch.hour_utc.toString().padStart(2, "0")}:00 UTC · {sch.format.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={sch.enabled} onCheckedChange={(v) => void toggle(sch.id, v)} />
                      <Button size="icon" variant="ghost" onClick={() => openEditor(sch)} aria-label="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(sch)} aria-label="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Próxima execução: {new Date(sch.next_run_at).toLocaleString()}</span>
                    {sch.last_run_at && <span>· Última: {new Date(sch.last_run_at).toLocaleString()}</span>}
                  </div>

                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => (runs ? setOpenedRuns((p) => ({ ...p, [sch.id]: undefined })) : void loadRuns(sch))}
                    >
                      {runs ? "Ocultar execuções" : "Ver execuções"}
                    </Button>
                  </div>

                  {isLoadingRuns && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Carregando execuções…
                    </div>
                  )}

                  {Array.isArray(runs) && runsList.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhuma execução registrada.</p>
                  )}

                  {runsList.length > 0 && (
                    <div className="space-y-1 border-t pt-2">
                      {runsList.map((run) => {
                        const st = statusBadge(run.status);
                        return (
                          <div key={run.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant={st.variant}>{st.label}</Badge>
                              <span className="text-muted-foreground truncate">
                                {new Date(run.started_at).toLocaleString()} · tent. {run.attempt}
                              </span>
                              {run.delivery_status === "skipped" && (
                                <Badge variant="outline" title={run.delivery_reason ?? undefined}>
                                  Domínio de e-mail não configurado
                                </Badge>
                              )}
                              {run.delivery_status === "sent" && <Badge variant="secondary">Enviado</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              {run.signed_url && (
                                <a
                                  href={run.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Download className="h-3.5 w-3.5" /> Baixar
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && schedules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum agendamento cadastrado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ScheduleModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        scope={scope}
        viewState={viewState}
        initial={editing}
        onSubmit={handleSubmit}
      />

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. As execuções anteriores permanecerão no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) await remove(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
