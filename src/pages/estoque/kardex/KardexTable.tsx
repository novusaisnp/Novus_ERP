// P14.1: Componente de tabela do Kardex
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { KardexRow } from '@/services/estoque/relatoriosService';

const tipoLabel: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (-)',
  INVENTARIO: 'Inventário',
};

const tipoBadge: Record<string, string> = {
  ENTRADA: 'bg-primary/10 text-primary',
  SAIDA: 'bg-destructive/10 text-destructive',
  TRANSFERENCIA: 'bg-accent/20 text-accent-foreground',
  AJUSTE_POSITIVO: 'bg-primary/10 text-primary',
  AJUSTE_NEGATIVO: 'bg-destructive/10 text-destructive',
  INVENTARIO: 'bg-secondary text-secondary-foreground',
};

const fmtQtd = (n: number) => (n === 0 ? '—' : Number(n).toFixed(3));
const fmtSaldo = (n: number) => Number(n).toFixed(3);
const fmtMoney = (n: number) =>
  n === 0 ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface KardexTableProps {
  rows: KardexRow[];
  isLoading: boolean;
}

export const KardexTable: React.FC<KardexTableProps> = ({ rows, isLoading }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead className="text-right">Entrada</TableHead>
          <TableHead className="text-right">Saída</TableHead>
          <TableHead className="text-right">Saldo</TableHead>
          <TableHead className="text-right">Custo Unit.</TableHead>
          <TableHead className="text-right">Custo Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Carregando...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              Nenhuma movimentação encontrada no período
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.id} data-testid={`kardex-row-${r.id}`}>
            <TableCell className="whitespace-nowrap">
              {new Date(r.data_movimento).toLocaleString('pt-BR')}
            </TableCell>
            <TableCell>
              <Badge className={tipoBadge[r.tipo] ?? ''} variant="outline">
                {tipoLabel[r.tipo] ?? r.tipo}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{r.documento_ref ?? '—'}</TableCell>
            <TableCell className="text-right font-mono">{fmtQtd(Number(r.qtd_entrada))}</TableCell>
            <TableCell className="text-right font-mono">{fmtQtd(Number(r.qtd_saida))}</TableCell>
            <TableCell data-testid={`kardex-saldo-${r.id}`} className="text-right font-mono font-semibold">
              {fmtSaldo(Number(r.saldo_acumulado))}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">
              {fmtMoney(Number(r.custo_unitario))}
            </TableCell>
            <TableCell className="text-right font-mono">
              {fmtMoney(Number(r.custo_total))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
