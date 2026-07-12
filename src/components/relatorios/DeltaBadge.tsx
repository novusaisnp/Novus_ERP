import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent, type Delta } from '@/utils/reportComparison';

interface DeltaBadgeProps {
  delta: Delta;
  formatValue?: (v: number) => string;
  className?: string;
}

export function DeltaBadge({ delta, formatValue, className }: DeltaBadgeProps) {
  const Icon =
    delta.status === 'up' ? ArrowUpRight : delta.status === 'down' ? ArrowDownRight : Minus;

  const colorClass =
    delta.status === 'up'
      ? 'text-green-600 dark:text-green-500'
      : delta.status === 'down'
        ? 'text-destructive'
        : delta.status === 'new'
          ? 'text-primary'
          : 'text-muted-foreground';

  const absLabel = formatValue
    ? formatValue(delta.absoluto)
    : delta.absoluto.toLocaleString('pt-BR');

  return (
    <div
      className={cn('flex items-center gap-1 text-xs font-medium', colorClass, className)}
      aria-label={`Variação: ${formatPercent(delta.percentual)}`}
    >
      <Icon className="h-3 w-3" />
      <span>{formatPercent(delta.percentual)}</span>
      <span className="text-muted-foreground">({absLabel})</span>
    </div>
  );
}
