import { CheckCircle2, XCircle, FileWarning, RefreshCw, Ban, MailCheck } from "lucide-react";
import type { FiscalEvento } from "@/hooks/fiscal/useFiscalDocumento";
import { cn } from "@/lib/utils";

interface EventosTimelineProps {
  eventos: FiscalEvento[];
  loading?: boolean;
}

const iconFor = (tipo: string) => {
  switch (tipo) {
    case 'autorizacao': return { icon: CheckCircle2, color: 'text-status-delivered' };
    case 'cancelamento': return { icon: Ban, color: 'text-destructive' };
    case 'cce': return { icon: MailCheck, color: 'text-primary' };
    case 'rejeicao':
    case 'denegacao':
    case 'erro_emissao': return { icon: XCircle, color: 'text-destructive' };
    case 'processamento': return { icon: RefreshCw, color: 'text-muted-foreground' };
    default: return { icon: FileWarning, color: 'text-muted-foreground' };
  }
};

const EventosTimeline = ({ eventos, loading }: EventosTimelineProps) => {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando eventos…</p>;
  }
  if (!eventos.length) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  }
  return (
    <ol className="relative border-l border-border ml-3 space-y-4">
      {eventos.map((ev) => {
        const { icon: Icon, color } = iconFor(ev.tipo);
        return (
          <li key={ev.id} className="ml-4">
            <span className={cn("absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border", color)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="text-sm">
              <p className="font-medium capitalize">
                {ev.tipo.replace(/_/g, ' ')}
                {ev.sequencia ? ` #${ev.sequencia}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(ev.created_at).toLocaleString('pt-BR')}
                {ev.protocolo && ` — ${ev.protocolo}`}
              </p>
              {ev.justificativa && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ev.justificativa}</p>
              )}
              {ev.motivo_rejeicao && (
                <p className="text-xs text-destructive mt-1">{ev.motivo_rejeicao}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default EventosTimeline;
