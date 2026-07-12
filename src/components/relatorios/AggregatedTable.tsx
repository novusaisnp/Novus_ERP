import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AggregatedRow } from '@/utils/relatoriosAgg';

interface AggregatedTableProps {
  rows: AggregatedRow[];
  keyHeader: string;
  onRowClick?: (row: AggregatedRow) => void;
  activeKey?: string | null;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export function AggregatedTable({
  rows,
  keyHeader,
  onRowClick,
  activeKey,
}: AggregatedTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        Nenhum dado agregado para os filtros aplicados.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{keyHeader}</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={r.key}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn(
                onRowClick && 'cursor-pointer hover:bg-muted/50',
                activeKey === r.key && 'bg-muted',
              )}
            >
              <TableCell className="font-medium">{r.label}</TableCell>
              <TableCell className="text-right">{r.quantidade}</TableCell>
              <TableCell className="text-right">{brl(r.valor_total)}</TableCell>
              <TableCell className="text-right">
                {r.percentual.toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
