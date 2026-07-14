import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FiscalStatusBadgeProps {
  status?: string | null;
  className?: string;
  onClick?: () => void;
}

const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  autorizada: { label: 'NF-e autorizada', variant: 'default' },
  processando: { label: 'NF-e processando', variant: 'secondary' },
  cancelada: { label: 'NF-e cancelada', variant: 'destructive' },
  rejeitada: { label: 'NF-e rejeitada', variant: 'destructive' },
  denegada: { label: 'NF-e denegada', variant: 'destructive' },
  erro: { label: 'NF-e com erro', variant: 'destructive' },
};

const FiscalStatusBadge = ({ status, className, onClick }: FiscalStatusBadgeProps) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  const cfg = map[normalized] ?? { label: `NF-e ${status}`, variant: 'outline' as const };
  return (
    <Badge
      variant={cfg.variant}
      className={cn(onClick && 'cursor-pointer hover:opacity-80', className)}
      onClick={onClick}
    >
      {cfg.label}
    </Badge>
  );
};

export default FiscalStatusBadge;
