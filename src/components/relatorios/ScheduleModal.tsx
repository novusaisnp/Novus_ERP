import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  type ReportExportFormat,
  type ReportSchedule,
  type ReportScheduleFrequency,
  type ReportScheduleInput,
  type ReportScheduleScope,
  type ReportScheduleViewStateV1,
  validateScheduleInput,
} from "@/types/reportSchedule";

const DOW_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: ReportScheduleScope;
  viewState: ReportScheduleViewStateV1;
  initial?: ReportSchedule | null;
  onSubmit: (payload: ReportScheduleInput, id?: string) => Promise<void>;
}

export function ScheduleModal({ open, onOpenChange, scope, viewState, initial, onSubmit }: ScheduleModalProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<ReportScheduleFrequency>("daily");
  const [hour, setHour] = useState(8);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [format, setFormat] = useState<ReportExportFormat>("csv");
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setFrequency(initial.frequency);
      setHour(initial.hour_utc);
      setDayOfWeek(initial.day_of_week ?? 1);
      setDayOfMonth(initial.day_of_month ?? 1);
      setFormat(initial.format);
      setRecipientsRaw(initial.recipients.join(", "));
      setEnabled(initial.enabled);
    } else {
      setName("");
      setFrequency("daily");
      setHour(8);
      setDayOfWeek(1);
      setDayOfMonth(1);
      setFormat("csv");
      setRecipientsRaw("");
      setEnabled(true);
    }
    setErrors({});
    setSubmitError(null);
  }, [open, initial]);

  const recipients = useMemo(
    () => recipientsRaw.split(",").map((r) => r.trim()).filter((r) => r.length > 0),
    [recipientsRaw],
  );

  const handleSubmit = async () => {
    const payload: ReportScheduleInput = {
      name,
      scope,
      format,
      frequency,
      hour_utc: hour,
      day_of_week: frequency === "weekly" ? dayOfWeek : null,
      day_of_month: frequency === "monthly" ? dayOfMonth : null,
      recipients,
      view_state: { ...viewState, schema_version: 1, scope },
      enabled,
    };
    const validation = validateScheduleInput(payload);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(payload, initial?.id);
      onOpenChange(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          <DialogDescription>
            Envio automático de relatórios com a visão atual (filtros e agrupamento).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sch-name">Nome</Label>
            <Input id="sch-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ReportScheduleFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sch-hour">Hora (UTC)</Label>
              <Input
                id="sch-hour"
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
              />
              {errors.hour_utc && <p className="text-xs text-destructive">{errors.hour_utc}</p>}
            </div>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOW_LABELS.map((l, i) => (
                    <SelectItem key={i} value={String(i)}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.day_of_week && <p className="text-xs text-destructive">{errors.day_of_week}</p>}
            </div>
          )}

          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label htmlFor="sch-dom">Dia do mês (1-28)</Label>
              <Input
                id="sch-dom"
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
              {errors.day_of_month && <p className="text-xs text-destructive">{errors.day_of_month}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>Formato</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ReportExportFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sch-rec">Destinatários (opcional, até 5, separados por vírgula)</Label>
            <Input
              id="sch-rec"
              placeholder="email1@ex.com, email2@ex.com"
              value={recipientsRaw}
              onChange={(e) => setRecipientsRaw(e.target.value)}
              autoComplete="off"
            />
            {errors.recipients && <p className="text-xs text-destructive">{errors.recipients}</p>}
            <p className="text-xs text-muted-foreground">
              O envio por e-mail ficará em espera até o domínio transacional ser configurado.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Ativo</p>
              <p className="text-xs text-muted-foreground">Executa nos horários agendados.</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {initial ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
