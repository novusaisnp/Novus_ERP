import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DrillFilterBadgeProps {
  label: string;
  value: string;
  onClear: () => void;
}

export function DrillFilterBadge({ label, value, onClear }: DrillFilterBadgeProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">Filtro ativo:</span>
      <Badge variant="secondary" className="gap-1">
        <span className="font-medium">{label}:</span>
        <span>{value}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
          onClick={onClear}
          aria-label="Limpar filtro"
        >
          <X className="h-3 w-3" />
        </Button>
      </Badge>
    </div>
  );
}
