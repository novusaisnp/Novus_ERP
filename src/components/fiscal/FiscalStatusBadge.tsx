import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FiscalStatusBadgeProps {
  status?: string | null;
  className?: string;
  onClick?: () => void;
  /** 'contingencia' mostra um badge secundário indicando emissão offline. */
  formaEmissao?: string | null;
}

const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  autorizada: { label: 'NF-e autorizada', variant: 'default' },
  processando: { label: 'NF-e processando', variant: 'secondary' },
  cancelada: { label: 'NF-e cancelada', variant: 'destructive' },
  rejeitada: { label: 'NF-e rejeitada', variant: 'destructive' },
  denegada: { label: 'NF-e denegada', variant: 'destructive' },
  erro: { label: 'NF-e com erro', variant: 'destructive' },
  falha_comunicacao: { label: 'Falha de comunicação', variant: 'destructive' },
};

const FiscalStatusBadge = ({ status, className, onClick, formaEmissao }: FiscalStatusBadgeProps) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const cfg = map[normalized] ?? { label: `NF-e ${status}`, variant: 'outline' as const };
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        variant={cfg.variant}
        className={cn(onClick && 'cursor-pointer hover:opacity-80', className)}
        onClick={onClick}
      >
        {cfg.label}
      </Badge>
      {formaEmissao?.toLowerCase() === 'contingencia' && (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          Em contingência
        </Badge>
      )}
    </span>
  );
};

export default FiscalStatusBadge;
