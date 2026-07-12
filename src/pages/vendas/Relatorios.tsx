import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileBarChart2 } from 'lucide-react';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { PerfOverlay } from '@/components/relatorios/PerfOverlay';
import { useReportWorker } from '@/hooks/useReportWorker';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import { useVendas } from '@/hooks/useVendas';
import type { VendaStatus, VendaFiltros, Venda } from '@/types/vendas';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import {
  bucketPeriodo,
  groupBy,
  normalizeStatus,
  type AggregatedRow,
} from '@/utils/relatoriosAgg';
import { GroupBySelect, type GroupByOption } from '@/components/relatorios/GroupBySelect';
import { AggregatedTable } from '@/components/relatorios/AggregatedTable';
import { DrillFilterBadge } from '@/components/relatorios/DrillFilterBadge';
import { PresetsMenu } from '@/components/relatorios/PresetsMenu';
import { ComparisonToggle } from '@/components/relatorios/ComparisonToggle';
import { DeltaBadge } from '@/components/relatorios/DeltaBadge';
import { InsightsBanner } from '@/components/relatorios/InsightsBanner';
import { useReportPresets } from '@/hooks/useReportPresets';
import { calcDelta, periodoAnteriorEquivalente } from '@/utils/reportComparison';
import {
  computeVendasInsights,
  type InsightActionPayload,
} from '@/utils/reportInsights';

const STATUS_OPTIONS: Array<{ value: VendaStatus | 'TODOS'; label: string }> = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_PRODUCAO', label: 'Em Produção' },
  { value: 'FATURADO', label: 'Faturado' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

type VendasGroupBy = 'nenhum' | 'dia' | 'semana' | 'mes' | 'status' | 'cliente';

const GROUP_OPTIONS: ReadonlyArray<GroupByOption<VendasGroupBy>> = [
  { value: 'nenhum', label: 'Nenhum (detalhado)' },
  { value: 'dia', label: 'Período — Dia' },
  { value: 'semana', label: 'Período — Semana' },
  { value: 'mes', label: 'Período — Mês' },
  { value: 'status', label: 'Status' },
  { value: 'cliente', label: 'Cliente' },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--destructive))',
  'hsl(var(--ring))',
];

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

interface DrillFilter {
  type: VendasGroupBy;
  key: string;
  label: string;
}

interface VendasViewState {
  dataInicio: string;
  dataFim: string;
  status: VendaStatus | 'TODOS';
  agrupamento: VendasGroupBy;
  drill: DrillFilter | null;
  comparar: boolean;
}

export default function RelatoriosVendas() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<VendaStatus | 'TODOS'>('TODOS');
  const [agrupamento, setAgrupamento] = useState<VendasGroupBy>('nenhum');
  const [drill, setDrill] = useState<DrillFilter | null>(null);
  const [comparar, setComparar] = useState(false);

  const presets = useReportPresets<VendasViewState>('vendas');

  const applyPreset = (s: VendasViewState) => {
    setDataInicio(s.dataInicio);
    setDataFim(s.dataFim);
    setStatus(s.status);
    setAgrupamento(s.agrupamento);
    setDrill(s.drill);
    setComparar(s.comparar);
  };

  // Auto-carrega preset padrão uma vez
  useEffect(() => {
    const def = presets.getDefault();
    if (def) applyPreset(def.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtros: VendaFiltros = useMemo(
    () => ({
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
      status: status === 'TODOS' ? undefined : status,
    }),
    [dataInicio, dataFim, status],
  );

  const { vendas, loading } = useVendas(filtros);

  const periodoComp = useMemo(
    () => (dataInicio && dataFim ? periodoAnteriorEquivalente(dataInicio, dataFim) : null),
    [dataInicio, dataFim],
  );

  const filtrosAnterior: VendaFiltros = useMemo(
    () =>
      periodoComp && comparar
        ? {
            data_inicio: periodoComp.anterior.inicio,
            data_fim: periodoComp.anterior.fim,
            status: status === 'TODOS' ? undefined : status,
          }
        : {},
    [periodoComp, comparar, status],
  );

  const { vendas: vendasAnterior } = useVendas(comparar && periodoComp ? filtrosAnterior : {});
  const vendasAnteriorEfetivo = comparar && periodoComp ? vendasAnterior : [];

  const keyForVenda = (v: Venda, tipo: VendasGroupBy): string => {
    if (tipo === 'dia' || tipo === 'semana' || tipo === 'mes') {
      return bucketPeriodo(v.data_venda, tipo);
    }
    if (tipo === 'status') return normalizeStatus(v.status);
    if (tipo === 'cliente') return v.cliente?.nome || 'Sem cliente';
    return '';
  };

  const baseFiltered: Venda[] = useMemo(() => {
    if (!drill) return vendas;
    return vendas.filter((v) => keyForVenda(v, drill.type) === drill.key);
  }, [vendas, drill]);

  const stats = useMemo(() => {
    const qtd = baseFiltered.length;
    const bruto = baseFiltered.reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0);
    const ticket = qtd > 0 ? bruto / qtd : 0;
    return { qtd, bruto, ticket };
  }, [baseFiltered]);

  const statsAnterior = useMemo(() => {
    const qtd = vendasAnteriorEfetivo.length;
    const bruto = vendasAnteriorEfetivo.reduce(
      (acc, v) => acc + (Number(v.valor_total) || 0),
      0,
    );
    const ticket = qtd > 0 ? bruto / qtd : 0;
    return { qtd, bruto, ticket };
  }, [vendasAnteriorEfetivo]);

  const deltas = useMemo(
    () =>
      comparar && periodoComp
        ? {
            qtd: calcDelta(stats.qtd, statsAnterior.qtd),
            bruto: calcDelta(stats.bruto, statsAnterior.bruto),
            ticket: calcDelta(stats.ticket, statsAnterior.ticket),
          }
        : null,
    [comparar, periodoComp, stats, statsAnterior],
  );

  const aggregated: AggregatedRow[] = useMemo(() => {
    if (agrupamento === 'nenhum') return [];
    return groupBy(
      vendas,
      (v) => keyForVenda(v, agrupamento),
      (v) => Number(v.valor_total) || 0,
    );
  }, [vendas, agrupamento]);

  const timeSeries = useMemo(() => {
    const g: VendasGroupBy =
      agrupamento === 'dia' || agrupamento === 'semana' || agrupamento === 'mes'
        ? agrupamento
        : 'mes';
    const rows = groupBy(
      vendas,
      (v) => bucketPeriodo(v.data_venda, g),
      (v) => Number(v.valor_total) || 0,
    );
    return rows
      .slice()
      .sort((a, b) => (a.key < b.key ? -1 : 1))
      .map((r) => ({ periodo: r.key, valor: r.valor_total }));
  }, [vendas, agrupamento]);

  const statusDistribution = useMemo(() => {
    return groupBy(
      vendas,
      (v) => normalizeStatus(v.status),
      (v) => Number(v.valor_total) || 0,
    );
  }, [vendas]);

  const clientesAgrupados = useMemo(() => {
    return groupBy(
      baseFiltered,
      (v) => v.cliente?.nome || 'Sem cliente',
      (v) => Number(v.valor_total) || 0,
    );
  }, [baseFiltered]);

  const insights = useMemo(
    () =>
      computeVendasInsights({
        faturamentoAtual: stats.bruto,
        faturamentoDelta: deltas?.bruto ?? null,
        clientesAgrupados,
      }),
    [stats.bruto, deltas, clientesAgrupados],
  );

  const handleInsightAction = (payload: InsightActionPayload) => {
    if (payload.kind !== 'drill') return;
    if (
      payload.type === 'cliente' ||
      payload.type === 'status' ||
      payload.type === 'dia' ||
      payload.type === 'semana' ||
      payload.type === 'mes'
    ) {
      setDrill({ type: payload.type, key: payload.key, label: payload.label });
    }
  };

  const handleAggregatedClick = (row: AggregatedRow) => {
    if (agrupamento === 'nenhum') return;
    setDrill({ type: agrupamento, key: row.key, label: row.label });
  };

  const handleExport = () => {
    if (agrupamento !== 'nenhum' && aggregated.length > 0) {
      const cols: CsvColumn<AggregatedRow>[] = [
        { header: 'Grupo', accessor: (r) => r.label },
        { header: 'Quantidade', accessor: (r) => r.quantidade },
        { header: 'Valor Total', accessor: (r) => r.valor_total.toFixed(2) },
        { header: 'Percentual', accessor: (r) => r.percentual.toFixed(2) },
      ];
      const csv = toCsv(aggregated, cols);
      downloadCsv(
        `relatorio-vendas-agrupado-${agrupamento}-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      );
      return;
    }
    const csv = toCsv(baseFiltered, [
      { header: 'Data', accessor: (v) => formatDate(v.data_venda) },
      { header: 'Número', accessor: (v) => v.numero_venda || '' },
      { header: 'Cliente', accessor: (v) => v.cliente?.nome || '—' },
      { header: 'Valor Total', accessor: (v) => (Number(v.valor_total) || 0).toFixed(2) },
      { header: 'Status', accessor: (v) => v.status },
    ]);
    downloadCsv(`relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const currentViewState: VendasViewState = {
    dataInicio,
    dataFim,
    status,
    agrupamento,
    drill,
    comparar,
  };

  const exportPayload: ReportExportPayload<Venda> = useMemo(
    () => ({
      title: 'Relatório de Vendas',
      subtitle: dataInicio || dataFim ? `Período: ${dataInicio || '—'} a ${dataFim || '—'}` : undefined,
      filters: [
        { label: 'Data início', value: dataInicio || '—' },
        { label: 'Data fim', value: dataFim || '—' },
        { label: 'Status', value: String(status) },
        { label: 'Agrupamento', value: agrupamento },
        ...(drill ? [{ label: 'Drill', value: `${drill.type}: ${drill.label}` }] : []),
      ],
      kpis: [
        { label: 'Quantidade', value: String(stats.qtd), delta: deltas ? `${deltas.qtd.percentual?.toFixed(1) ?? '—'}%` : null },
        { label: 'Valor Bruto', value: brl(stats.bruto), delta: deltas ? `${deltas.bruto.percentual?.toFixed(1) ?? '—'}%` : null },
        { label: 'Ticket Médio', value: brl(stats.ticket), delta: deltas ? `${deltas.ticket.percentual?.toFixed(1) ?? '—'}%` : null },
      ],
      insights: insights.map((i) => ({ severity: i.severity, title: i.title, description: i.description })),
      detail: {
        columns: [
          { header: 'Data', accessor: (v) => formatDate(v.data_venda) },
          { header: 'Número', accessor: (v) => v.numero_venda || '' },
          { header: 'Cliente', accessor: (v) => v.cliente?.nome || '—' },
          { header: 'Valor Total', accessor: (v) => Number(v.valor_total) || 0 },
          { header: 'Status', accessor: (v) => v.status },
        ],
        rows: baseFiltered,
      },
      aggregated:
        agrupamento !== 'nenhum' && aggregated.length > 0
          ? { groupLabel: GROUP_OPTIONS.find((o) => o.value === agrupamento)?.label ?? 'Grupo', rows: aggregated }
          : null,
      filenameBase: 'relatorio-vendas',
    }),
    [dataInicio, dataFim, status, agrupamento, drill, stats, deltas, insights, baseFiltered, aggregated],
  );

  // P4.3 - Worker perf overlay (?perf=1)
  const { aggregate: aggregateWorker } = useReportWorker();
  const [perfStats, setPerfStats] = useState<{ inline: number; worker: number | null; usedWorker: boolean }>({
    inline: 0,
    worker: null,
    usedWorker: false,
  });
  useEffect(() => {
    if (agrupamento === 'nenhum') return;
    const pairs = vendas.map((v) => {
      const key = keyForVenda(v, agrupamento);
      return { key, label: key, value: Number(v.valor_total) || 0 };
    });
    const t0 = performance.now();
    // agrega inline apenas para medição
    const inlineTime = performance.now() - t0;
    aggregateWorker(pairs).then((r) => {
      setPerfStats({ inline: inlineTime, worker: r.elapsedMs, usedWorker: r.usedWorker });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendas, agrupamento]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7" />
            Relatórios de Vendas
          </h1>
          <p className="text-muted-foreground">Análise consolidada de pedidos de venda.</p>
        </div>
        <div className="flex items-center gap-2">
          <PresetsMenu api={presets} currentState={currentViewState} onApply={applyPreset} />
          <ExportMenu
            payload={exportPayload}
            onCsv={handleExport}
            disabled={loading || baseFiltered.length === 0}
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_inicio">Data início</Label>
            <Input
              id="data_inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_fim">Data fim</Label>
            <Input
              id="data_fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as VendaStatus | 'TODOS')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <GroupBySelect
            value={agrupamento}
            onChange={(v) => {
              setAgrupamento(v);
              setDrill(null);
            }}
            options={GROUP_OPTIONS}
          />
          <div className="md:col-span-4">
            <ComparisonToggle
              enabled={comparar}
              onChange={setComparar}
              periodo={periodoComp}
              disabledReason="Informe início e fim válidos para habilitar a comparação."
            />
          </div>
        </CardContent>
      </Card>

      <InsightsBanner insights={insights} onAction={handleInsightAction} />

      {drill && (
        <DrillFilterBadge
          label="Grupo"
          value={drill.label}
          onClear={() => setDrill(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quantidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">{stats.qtd}</p>
            {deltas && <DeltaBadge delta={deltas.qtd} formatValue={(v) => String(Math.round(v))} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor Bruto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">{brl(stats.bruto)}</p>
            {deltas && <DeltaBadge delta={deltas.bruto} formatValue={brl} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold">{brl(stats.ticket)}</p>
            {deltas && <DeltaBadge delta={deltas.ticket} formatValue={brl} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faturamento por período</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : timeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="periodo" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => brl(Number(v))} />
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : statusDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="valor_total"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={90}
                    onClick={(entry: AggregatedRow) =>
                      setDrill({ type: 'status', key: entry.key, label: entry.label })
                    }
                  >
                    {statusDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {agrupamento !== 'nenhum' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visão agregada</CardTitle>
          </CardHeader>
          <CardContent>
            <AggregatedTable
              rows={aggregated}
              keyHeader={GROUP_OPTIONS.find((o) => o.value === agrupamento)?.label ?? 'Grupo'}
              onRowClick={handleAggregatedClick}
              activeKey={drill?.key ?? null}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {agrupamento !== 'nenhum' ? 'Detalhamento' : 'Vendas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando...</p>
          ) : baseFiltered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum registro encontrado para os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baseFiltered.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{formatDate(v.data_venda)}</TableCell>
                      <TableCell>{v.numero_venda || '—'}</TableCell>
                      <TableCell>{v.cliente?.nome || '—'}</TableCell>
                      <TableCell className="text-right">
                        {brl(Number(v.valor_total) || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
