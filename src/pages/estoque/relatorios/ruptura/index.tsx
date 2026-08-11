// P14.2: Relatório Ruptura de Estoque
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useRelatorioRuptura } from '@/hooks/estoque/useRelatoriosEstoque';
import { downloadCsv, rowsToCsv, type RupturaRow } from '@/services/estoque/relatoriosService';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { useReportBranding } from '@/hooks/useReportBranding';
import type { ReportExportPayload } from '@/utils/reportExportShared';

const statusBadge: Record<string, string> = {
  RUPTURA: 'bg-destructive/10 text-destructive',
  ABAIXO_MINIMO: 'bg-accent/20 text-accent-foreground',
  OK: 'bg-primary/10 text-primary',
};

const RupturaPage: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const params = useMemo(() => empresaId ? { empresaId } : null, [empresaId]);
  const { data = [], isLoading } = useRelatorioRuptura(params);
  const { branding } = useReportBranding();

  const handleExport = () => {
    if (data.length === 0) return;
    const csv = rowsToCsv(data as unknown as Record<string, unknown>[], [
      'produto_codigo', 'produto_nome', 'saldo_total', 'estoque_minimo', 'status',
    ]);
    downloadCsv(`ruptura_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const exportPayload: ReportExportPayload<RupturaRow> = {
    title: 'Ruptura de Estoque',
    branding,
    filters: [],
    kpis: [],
    insights: [],
    detail: {
      columns: [
        { header: 'Status', accessor: (r) => r.status },
        { header: 'Código', accessor: (r) => r.produto_codigo ?? '—' },
        { header: 'Produto', accessor: (r) => r.produto_nome },
        { header: 'Saldo', accessor: (r) => Number(r.saldo_total).toFixed(3) },
        { header: 'Estoque Mínimo', accessor: (r) => Number(r.estoque_minimo).toFixed(3) },
      ],
      rows: data,
    },
    filenameBase: 'ruptura-estoque',
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" /> Ruptura de Estoque
          </h1>
          <p className="text-muted-foreground">Produtos com saldo ≤ estoque mínimo.</p>
        </div>
        <ExportMenu payload={exportPayload} onCsv={handleExport} disabled={data.length === 0} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Estoque Mínimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum produto em ruptura</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.produto_id}>
                  <TableCell><Badge variant="outline" className={statusBadge[r.status]}>{r.status}</Badge></TableCell>
                  <TableCell className="font-mono">{r.produto_codigo ?? '—'}</TableCell>
                  <TableCell>{r.produto_nome}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.saldo_total).toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{Number(r.estoque_minimo).toFixed(3)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RupturaPage;
