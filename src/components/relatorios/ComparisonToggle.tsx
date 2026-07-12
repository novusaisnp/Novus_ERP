import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatRangeLabel, type PeriodoComparado } from '@/utils/reportComparison';

interface ComparisonToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  periodo: PeriodoComparado | null;
  disabledReason?: string;
}

export function ComparisonToggle({
  enabled,
  onChange,
  periodo,
  disabledReason,
}: ComparisonToggleProps) {
  const isDisabled = periodo === null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Switch
          id="comparar-periodo"
          checked={enabled && !isDisabled}
          onCheckedChange={(v) => onChange(v)}
          disabled={isDisabled}
        />
        <Label htmlFor="comparar-periodo" className="cursor-pointer">
          Comparar com período anterior
        </Label>
      </div>
      {isDisabled && disabledReason && (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      )}
      {enabled && periodo && (
        <p className="text-xs text-muted-foreground">
          Comparando com <span className="font-medium">{formatRangeLabel(periodo.anterior)}</span>
        </p>
      )}
    </div>
  );
}
