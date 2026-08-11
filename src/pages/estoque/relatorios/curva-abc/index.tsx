// P14.2: Relatório Curva ABC
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3 } from 'lucide-react';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useRelatorioCurvaAbc } from '@/hooks/estoque/useRelatoriosEstoque';
import { downloadCsv, rowsToCsv, type CurvaAbcRow } from '@/services/estoque/relatoriosService';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { useReportBranding } from '@/hooks/useReportBranding';
import type { ReportExportPayload } from '@/utils/reportExportShared';

const PAGE = 100;
const money = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => (Number(n) * 100).toFixed(1) + '%';
const classeBadge: Record<string, string> = {
  A: 'bg-primary/10 text-primary',
  B: 'bg-accent/20 text-accent-foreground',
  C: 'bg-muted text-muted-foreground',
};

const CurvaAbcPage: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [page, setPage] = useState(0);
  const params = useMemo(() => empresaId ? { empresaId, limit: PAGE, offset: page * PAGE } : null, [empresaId, page]);
  const { data, isLoading, isFetching } = useRelatorioCurvaAbc(params);
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const { branding } = useReportBranding();

  const handleExport = () => {
    if (rows.length === 0) return;
    const csv = rowsToCsv(rows as unknown as Record<string, unknown>[], [
      'codigo', 'nome', 'qtd_saida', 'valor_saida', 'percentual_acumulado', 'classe',
    ]);
    downloadCsv(`curva_abc_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const exportPayload: ReportExportPayload<CurvaAbcRow> = {
    title: 'Curva ABC',
    branding,
    filters: [],
    kpis: [],
    insights: [],
    detail: {
      columns: [
        { header: 'Código', accessor: (r) => r.codigo ?? '—' },
        { header: 'Produto', accessor: (r) => r.nome },
        { header: 'Qtd Saída', accessor: (r) => Number(r.qtd_saida).toFixed(3) },
        { header: 'Valor Saída', accessor: (r) => money(Number(r.valor_saida)) },
        { header: '% Acumulado', accessor: (r) => pct(Number(r.percentual_acumulado)) },
        { header: 'Classe', accessor: (r) => r.classe },
      ],
      rows,
    },
    filenameBase: 'curva-abc',
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-8 w-8" /> Curva ABC
          </h1>
          <p className="text-muted-foreground">
            Classificação Pareto por valor de saída (12m).
            {data?.refreshedAt && (
              <span className="ml-2 text-xs italic">
                atualizado em {new Date(data.refreshedAt).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <ExportMenu payload={exportPayload} onCsv={handleExport} disabled={rows.length === 0} />
      </div>

      <Card>
        <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-center">
          {(['A', 'B', 'C'] as const).map((cl) => {
            const items = rows.filter((r) => r.classe === cl);
            const soma = items.reduce((acc, r) => acc + Number(r.valor_saida), 0);
            return (
              <div key={cl} className="p-3 border rounded-md">
                <div className="text-sm text-muted-foreground">Classe {cl}</div>
                <div className="text-2xl font-bold text-primary">{items.length}</div>
                <div className="text-xs text-muted-foreground">{money(soma)}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd Saída</TableHead>
                <TableHead className="text-right">Valor Saída</TableHead>
                <TableHead className="text-right">% Acumulado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem dados (MV vazia ou sem saídas nos últimos 12 meses)</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.produto_id}>
                  <TableCell><Badge variant="outline" className={classeBadge[r.classe]}>{r.classe}</Badge></TableCell>
                  <TableCell className="font-mono">{r.codigo ?? '—'}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.qtd_saida).toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono">{money(Number(r.valor_saida))}</TableCell>
                  <TableCell className="text-right font-mono">{pct(Number(r.percentual_acumulado))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {total > 0 ? <>Mostrando {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} de {total}</> : 'Sem resultados'}
          {isFetching && <span className="ml-2 italic">atualizando…</span>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  );
};

export default CurvaAbcPage;
