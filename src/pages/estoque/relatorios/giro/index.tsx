// P14.2: Relatório de Giro de Estoque
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp } from 'lucide-react';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useRelatorioGiro } from '@/hooks/estoque/useRelatoriosEstoque';
import { downloadCsv, rowsToCsv, type GiroRow } from '@/services/estoque/relatoriosService';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { useReportBranding } from '@/hooks/useReportBranding';
import type { ReportExportPayload } from '@/utils/reportExportShared';

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().slice(0, 10); };
const fmt = (n: number | null | undefined, digits = 3) => (n === null || n === undefined ? '—' : Number(n).toFixed(digits));

const GiroPage: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [sp, setSp] = useSearchParams();
  const [dataInicio, setDataInicio] = useState(sp.get('ini') ?? daysAgoIso(30));
  const [dataFim, setDataFim] = useState(sp.get('fim') ?? todayIso());

  const params = useMemo(() => empresaId ? { empresaId, dataInicio, dataFim } : null, [empresaId, dataInicio, dataFim]);
  const { data = [], isLoading } = useRelatorioGiro(params);
  const { branding } = useReportBranding();

  const applyFilters = () => setSp({ ini: dataInicio, fim: dataFim });

  const handleExport = () => {
    if (data.length === 0) return;
    const csv = rowsToCsv(data as unknown as Record<string, unknown>[], [
      'codigo', 'nome', 'qtd_saida', 'saldo_inicial', 'saldo_final', 'estoque_medio', 'giro',
    ]);
    downloadCsv(`giro_${todayIso()}.csv`, csv);
  };

  const exportPayload: ReportExportPayload<GiroRow> = {
    title: 'Giro de Estoque',
    subtitle: `Período: ${dataInicio} a ${dataFim}`,
    branding,
    filters: [],
    kpis: [],
    insights: [],
    detail: {
      columns: [
        { header: 'Código', accessor: (r) => r.codigo ?? '—' },
        { header: 'Produto', accessor: (r) => r.nome },
        { header: 'Saída (qtd)', accessor: (r) => fmt(r.qtd_saida) },
        { header: 'Saldo Inicial', accessor: (r) => fmt(r.saldo_inicial) },
        { header: 'Saldo Final', accessor: (r) => fmt(r.saldo_final) },
        { header: 'Estoque Médio', accessor: (r) => fmt(r.estoque_medio) },
        { header: 'Giro', accessor: (r) => (r.giro !== null ? Number(r.giro).toFixed(2) : '—') },
      ],
      rows: data,
    },
    filenameBase: 'giro-estoque',
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="h-8 w-8" /> Giro de Estoque
          </h1>
          <p className="text-muted-foreground">Saídas ÷ estoque médio no período.</p>
        </div>
        <ExportMenu payload={exportPayload} onCsv={handleExport} disabled={data.length === 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ini">Data início</Label>
            <Input id="ini" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Data fim</Label>
            <Input id="fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full">Aplicar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Saída (qtd)</TableHead>
                <TableHead className="text-right">Saldo Inicial</TableHead>
                <TableHead className="text-right">Saldo Final</TableHead>
                <TableHead className="text-right">Estoque Médio</TableHead>
                <TableHead className="text-right">Giro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produto com movimentação no período</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.produto_id}>
                  <TableCell className="font-mono">{r.codigo ?? '—'}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.qtd_saida)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(r.saldo_inicial)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(r.saldo_final)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(r.estoque_medio)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{r.giro !== null ? Number(r.giro).toFixed(2) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GiroPage;
