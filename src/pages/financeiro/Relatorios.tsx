import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileBarChart2 } from 'lucide-react';
import BalancoPatrimonial from './BalancoPatrimonial';
import DRE from './DRE';
import DMPL from './DMPL';
import DFC from './DFC';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { ScheduleList } from '@/components/relatorios/ScheduleList';
import { normalizeViewState } from '@/types/reportSchedule';
import { CalendarClock } from 'lucide-react';
import { PerfOverlay } from '@/components/relatorios/PerfOverlay';
import { useReportWorker } from '@/hooks/useReportWorker';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import { useContasPagar } from '@/hooks/useContasPagar';
import { useContasReceber } from '@/hooks/useContasReceber';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import {
  bucketMes,
  bucketVencimento,
  FAIXA_LABEL,
  groupBy,
  normalizeStatus,
  type AggregatedRow,
  type FaixaVencimento,
} from '@/utils/relatoriosAgg';
import { GroupBySelect, type GroupByOption } from '@/components/relatorios/GroupBySelect';
import { AggregatedTable } from '@/components/relatorios/AggregatedTable';
import { DrillFilterBadge } from '@/components/relatorios/DrillFilterBadge';
import { PresetsMenu } from '@/components/relatorios/PresetsMenu';
import { ComparisonToggle } from '@/components/relatorios/ComparisonToggle';
import { DeltaBadge } from '@/components/relatorios/DeltaBadge';
import { InsightsBanner } from '@/components/relatorios/InsightsBanner';
import { useReportPresets } from '@/hooks/useReportPresets';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { calcDelta, periodoAnteriorEquivalente } from '@/utils/reportComparison';
import {
  computeFinanceiroInsights,
  type InsightActionPayload,
} from '@/utils/reportInsights';

type Tipo = 'TODOS' | 'RECEBER' | 'PAGAR';
type FinGroupBy = 'nenhum' | 'tipo' | 'situacao' | 'faixa_vencimento';

interface LinhaConsolidada {
  id: string;
  empresa_representada_id?: string | null;
  data_vencimento: string;
  tipo: 'Receber' | 'Pagar';
  descricao: string;
  contraparte: string;
  valor_original: number;
  situacao: string;
  faixa: FaixaVencimento;
}

const GROUP_OPTIONS: ReadonlyArray<GroupByOption<FinGroupBy>> = [
  { value: 'nenhum', label: 'Nenhum (detalhado)' },
  { value: 'tipo', label: 'Tipo (Receber/Pagar)' },
  { value: 'situacao', label: 'Situação' },
  { value: 'faixa_vencimento', label: 'Faixa de Vencimento' },
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
  type: FinGroupBy;
  key: string;
  label: string;
}

interface FinanceiroViewState {
  dataInicio: string;
  dataFim: string;
  tipoFiltro: Tipo;
  agrupamento: FinGroupBy;
  drill: DrillFilter | null;
  comparar: boolean;
}

function ConsolidadoFinanceiro() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<Tipo>('TODOS');
  const [agrupamento, setAgrupamento] = useState<FinGroupBy>('nenhum');
  const [drill, setDrill] = useState<DrillFilter | null>(null);
  const [comparar, setComparar] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const presets = useReportPresets<FinanceiroViewState>('financeiro');
  const { empresas } = useEmpresasRepresentadas();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresas);

  const applyPreset = (s: FinanceiroViewState) => {
    setDataInicio(s.dataInicio);
    setDataFim(s.dataFim);
    setTipoFiltro(s.tipoFiltro);
    setAgrupamento(s.agrupamento);
    setDrill(s.drill);
    setComparar(s.comparar);
  };

  useEffect(() => {
    const def = presets.getDefault();
    if (def) applyPreset(def.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtros = useMemo(
    () => ({
      data_vencimento_inicio: dataInicio || undefined,
      data_vencimento_fim: dataFim || undefined,
    }),
    [dataInicio, dataFim],
  );

  const {
    contasPagar,
    estatisticas: statsPagar,
    isLoading: loadingPagar,
    error: errPagar,
  } = useContasPagar(filtros);
  const {
    contasReceber,
    estatisticas: statsReceber,
    isLoading: loadingReceber,
    error: errReceber,
  } = useContasReceber(filtros);

  const periodoComp = useMemo(
    () => (dataInicio && dataFim ? periodoAnteriorEquivalente(dataInicio, dataFim) : null),
    [dataInicio, dataFim],
  );

  const filtrosAnterior = useMemo(
    () =>
      periodoComp && comparar
        ? {
            data_vencimento_inicio: periodoComp.anterior.inicio,
            data_vencimento_fim: periodoComp.anterior.fim,
          }
        : {},
    [periodoComp, comparar],
  );

  const { estatisticas: statsPagarAnt } = useContasPagar(
    comparar && periodoComp ? filtrosAnterior : {},
  );
  const { estatisticas: statsReceberAnt } = useContasReceber(
    comparar && periodoComp ? filtrosAnterior : {},
  );

  const totalReceber = statsReceber?.valor_total_aberto ?? 0;
  const totalPagar = statsPagar?.valor_total_aberto ?? 0;
  const saldo = totalReceber - totalPagar;

  const vencidoAtual =
    (statsReceber?.valor_total_vencido ?? 0) + (statsPagar?.valor_total_vencido ?? 0);
  const vencidoAnterior =
    (statsReceberAnt?.valor_total_vencido ?? 0) + (statsPagarAnt?.valor_total_vencido ?? 0);

  const deltas = useMemo(() => {
    if (!comparar || !periodoComp) return null;
    return {
      receber: calcDelta(totalReceber, statsReceberAnt?.valor_total_aberto ?? 0),
      pagar: calcDelta(totalPagar, statsPagarAnt?.valor_total_aberto ?? 0),
      saldo: calcDelta(
        saldo,
        (statsReceberAnt?.valor_total_aberto ?? 0) - (statsPagarAnt?.valor_total_aberto ?? 0),
      ),
      vencido: calcDelta(vencidoAtual, vencidoAnterior),
    };
  }, [comparar, periodoComp, totalReceber, totalPagar, saldo, vencidoAtual, vencidoAnterior, statsReceberAnt, statsPagarAnt]);

  const todasLinhas: LinhaConsolidada[] = useMemo(() => {
    const rows: LinhaConsolidada[] = [];
    if (tipoFiltro === 'TODOS' || tipoFiltro === 'RECEBER') {
      contasReceber.forEach((c) => {
        rows.push({
          id: `r-${c.id}`,
          empresa_representada_id: c.empresa_representada_id,
          data_vencimento: c.data_vencimento,
          tipo: 'Receber',
          descricao: c.descricao,
          contraparte: c.cliente?.nome || '—',
          valor_original: Number(c.valor_original) || 0,
          situacao: normalizeStatus(c.status),
          faixa: bucketVencimento(c.data_vencimento, undefined, c.status),
        });
      });
    }
    if (tipoFiltro === 'TODOS' || tipoFiltro === 'PAGAR') {
      contasPagar.forEach((c) => {
        rows.push({
          id: `p-${c.id}`,
          empresa_representada_id: c.empresa_representada_id,
          data_vencimento: c.data_vencimento,
          tipo: 'Pagar',
          descricao: c.descricao,
          contraparte: c.fornecedor?.razao_social || '—',
          valor_original: Number(c.valor_original) || 0,
          situacao: normalizeStatus(c.situacao),
          faixa: bucketVencimento(c.data_vencimento, undefined, c.situacao),
        });
      });
    }
    return rows.sort((a, b) => (a.data_vencimento < b.data_vencimento ? -1 : 1));
  }, [contasPagar, contasReceber, tipoFiltro]);

  const keyForLinha = (l: LinhaConsolidada, tipo: FinGroupBy): string => {
    if (tipo === 'tipo') return l.tipo;
    if (tipo === 'situacao') return l.situacao;
    if (tipo === 'faixa_vencimento') return l.faixa;
    return '';
  };

  const baseFiltered = useMemo(() => {
    if (!drill) return todasLinhas;
    return todasLinhas.filter((l) => keyForLinha(l, drill.type) === drill.key);
  }, [todasLinhas, drill]);

  const aggregated: AggregatedRow[] = useMemo(() => {
    if (agrupamento === 'nenhum') return [];
    return groupBy(
      todasLinhas,
      (l) => keyForLinha(l, agrupamento),
      (l) => l.valor_original,
      (key) => {
        if (agrupamento === 'faixa_vencimento') {
          return FAIXA_LABEL[key as FaixaVencimento] ?? key;
        }
        return key;
      },
    );
  }, [todasLinhas, agrupamento]);

  const faixasAgrupadas = useMemo(() => {
    return groupBy(
      todasLinhas,
      (l) => l.faixa,
      (l) => l.valor_original,
      (key) => FAIXA_LABEL[key as FaixaVencimento] ?? key,
    );
  }, [todasLinhas]);

  const insights = useMemo(
    () =>
      computeFinanceiroInsights({
        vencidosAtual: vencidoAtual,
        vencidosDelta: deltas?.vencido ?? null,
        totalAberto: totalReceber + totalPagar,
        faixasAgrupadas,
      }),
    [vencidoAtual, deltas, totalReceber, totalPagar, faixasAgrupadas],
  );

  const handleInsightAction = (payload: InsightActionPayload) => {
    if (payload.kind !== 'drill') return;
    if (
      payload.type === 'tipo' ||
      payload.type === 'situacao' ||
      payload.type === 'faixa_vencimento'
    ) {
      setAgrupamento(payload.type);
      setDrill({ type: payload.type, key: payload.key, label: payload.label });
    }
  };

  const seriePorMes = useMemo(() => {
    const map = new Map<string, { periodo: string; receber: number; pagar: number }>();
    todasLinhas.forEach((l) => {
      const k = bucketMes(l.data_vencimento);
      const cur = map.get(k) ?? { periodo: k, receber: 0, pagar: 0 };
      if (l.tipo === 'Receber') cur.receber += l.valor_original;
      else cur.pagar += l.valor_original;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => (a.periodo < b.periodo ? -1 : 1));
  }, [todasLinhas]);

  const vencidoVsAvencer = useMemo(() => {
    const buckets: Record<FaixaVencimento, { faixa: string; receber: number; pagar: number }> = {
      vencido: { faixa: FAIXA_LABEL.vencido, receber: 0, pagar: 0 },
      '0-7d': { faixa: FAIXA_LABEL['0-7d'], receber: 0, pagar: 0 },
      '8-30d': { faixa: FAIXA_LABEL['8-30d'], receber: 0, pagar: 0 },
      '31-60d': { faixa: FAIXA_LABEL['31-60d'], receber: 0, pagar: 0 },
      '60+d': { faixa: FAIXA_LABEL['60+d'], receber: 0, pagar: 0 },
      sem_data: { faixa: FAIXA_LABEL.sem_data, receber: 0, pagar: 0 },
    };
    todasLinhas.forEach((l) => {
      const b = buckets[l.faixa];
      if (l.tipo === 'Receber') b.receber += l.valor_original;
      else b.pagar += l.valor_original;
    });
    return Object.values(buckets);
  }, [todasLinhas]);

  const handleAggregatedClick = (row: AggregatedRow) => {
    if (agrupamento === 'nenhum') return;
    setDrill({ type: agrupamento, key: row.key, label: row.label });
  };

  const loading = loadingPagar || loadingReceber;
  const error = errPagar || errReceber;

  const reportBranding = useMemo(() => {
    const empresaId = baseFiltered.find((linha) => linha.empresa_representada_id)?.empresa_representada_id
      ?? todasLinhas.find((linha) => linha.empresa_representada_id)?.empresa_representada_id
      ?? empresas.find((empresa) => empresa.ativo !== false)?.id
      ?? empresas[0]?.id;
    const empresa = empresas.find((item) => item.id === empresaId) ?? empresas.find((item) => item.ativo !== false) ?? empresas[0];
    if (!empresa?.id) return null;
    const cfg = (empresa.configuracoes as Record<string, unknown> | null | undefined) ?? {};
    return {
      companyName: empresa.nome,
      logoUrl: logosMap?.get(empresa.id) ?? null,
      primaryColor: typeof cfg.primary_color === 'string' ? cfg.primary_color : null,
    };
  }, [baseFiltered, todasLinhas, empresas, logosMap]);

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
        `relatorio-financeiro-agrupado-${agrupamento}-${new Date().toISOString().slice(0, 10)}.csv`,
        csv,
      );
      return;
    }
    const csv = toCsv(baseFiltered, [
      { header: 'Vencimento', accessor: (r) => formatDate(r.data_vencimento) },
      { header: 'Tipo', accessor: (r) => r.tipo },
      { header: 'Descrição', accessor: (r) => r.descricao },
      { header: 'Contraparte', accessor: (r) => r.contraparte },
      { header: 'Valor Original', accessor: (r) => r.valor_original.toFixed(2) },
      { header: 'Situação', accessor: (r) => r.situacao },
      { header: 'Faixa', accessor: (r) => FAIXA_LABEL[r.faixa] },
    ]);
    downloadCsv(`relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const currentViewState: FinanceiroViewState = {
    dataInicio,
    dataFim,
    tipoFiltro,
    agrupamento,
    drill,
    comparar,
  };

  const exportPayload: ReportExportPayload<LinhaConsolidada> = useMemo(
    () => ({
      title: 'Relatório Financeiro',
      subtitle: dataInicio || dataFim ? `Vencimento: ${dataInicio || '—'} a ${dataFim || '—'}` : undefined,
      branding: reportBranding,
      filters: [
        { label: 'Vencimento início', value: dataInicio || '—' },
        { label: 'Vencimento fim', value: dataFim || '—' },
        { label: 'Tipo', value: String(tipoFiltro) },
        { label: 'Agrupamento', value: agrupamento },
        ...(drill ? [{ label: 'Drill', value: `${drill.type}: ${drill.label}` }] : []),
      ],
      kpis: [
        { label: 'Total a Receber', value: brl(totalReceber), delta: deltas ? `${deltas.receber.percentual?.toFixed(1) ?? '—'}%` : null },
        { label: 'Total a Pagar', value: brl(totalPagar), delta: deltas ? `${deltas.pagar.percentual?.toFixed(1) ?? '—'}%` : null },
        { label: 'Saldo Projetado', value: brl(saldo), delta: deltas ? `${deltas.saldo.percentual?.toFixed(1) ?? '—'}%` : null },
      ],
      insights: insights.map((i) => ({ severity: i.severity, title: i.title, description: i.description })),
      detail: {
        columns: [
          { header: 'Vencimento', accessor: (r) => formatDate(r.data_vencimento) },
          { header: 'Tipo', accessor: (r) => r.tipo },
          { header: 'Descrição', accessor: (r) => r.descricao },
          { header: 'Contraparte', accessor: (r) => r.contraparte },
          { header: 'Valor Original', accessor: (r) => r.valor_original },
          { header: 'Situação', accessor: (r) => r.situacao },
          { header: 'Faixa', accessor: (r) => FAIXA_LABEL[r.faixa] },
        ],
        rows: baseFiltered,
      },
      aggregated:
        agrupamento !== 'nenhum' && aggregated.length > 0
          ? { groupLabel: GROUP_OPTIONS.find((o) => o.value === agrupamento)?.label ?? 'Grupo', rows: aggregated }
          : null,
      filenameBase: 'relatorio-financeiro',
    }),
    [dataInicio, dataFim, tipoFiltro, agrupamento, drill, reportBranding, totalReceber, totalPagar, saldo, deltas, insights, baseFiltered, aggregated],
  );

  const { aggregate: aggregateWorker } = useReportWorker();
  const [perfStats, setPerfStats] = useState<{ inline: number; worker: number | null; usedWorker: boolean }>({
    inline: 0,
    worker: null,
    usedWorker: false,
  });
  useEffect(() => {
    if (agrupamento === 'nenhum') return;
    const pairs = todasLinhas.map((l) => {
      const key = keyForLinha(l, agrupamento);
      const label =
        agrupamento === 'faixa_vencimento' ? FAIXA_LABEL[key as FaixaVencimento] ?? key : key;
      return { key, label, value: l.valor_original };
    });
    aggregateWorker(pairs).then((r) => {
      setPerfStats({ inline: 0, worker: r.elapsedMs, usedWorker: r.usedWorker });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todasLinhas, agrupamento]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-end gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <PresetsMenu api={presets} currentState={currentViewState} onApply={applyPreset} />
          <ExportMenu
            payload={exportPayload}
            onCsv={handleExport}
            disabled={loading || logosLoading || baseFiltered.length === 0}
          />
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="h-4 w-4 mr-1" /> Agendar…
          </Button>
        </div>
      </header>
      <ScheduleList
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        scope="financeiro"
        viewState={normalizeViewState('financeiro', currentViewState as unknown as Record<string, unknown>)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ini">Vencimento início</Label>
            <Input
              id="ini"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Vencimento fim</Label>
            <Input
              id="fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as Tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="RECEBER">A Receber</SelectItem>
                <SelectItem value="PAGAR">A Pagar</SelectItem>
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
            <CardTitle className="text-sm text-muted-foreground">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-status-delivered">
              {brl(totalReceber)}
            </p>
            {deltas && <DeltaBadge delta={deltas.receber} formatValue={brl} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total a Pagar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold text-status-cancelled">
              {brl(totalPagar)}
            </p>
            {deltas && <DeltaBadge delta={deltas.pagar} formatValue={brl} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo Projetado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p
              className={`text-2xl font-bold ${
                saldo >= 0
                  ? 'text-status-delivered'
                  : 'text-status-cancelled'
              }`}
            >
              {brl(saldo)}
            </p>
            {deltas && <DeltaBadge delta={deltas.saldo} formatValue={brl} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receber vs Pagar por mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : seriePorMes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriePorMes}>
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
                  <Legend />
                  <Bar dataKey="receber" name="Receber" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pagar" name="Pagar" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vencido vs A vencer</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vencidoVsAvencer}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="faixa" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => brl(Number(v))} />
                  <Tooltip
                    formatter={(v: number) => brl(Number(v))}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="receber" name="Receber" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="pagar" name="Pagar" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
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
            {agrupamento !== 'nenhum' ? 'Detalhamento' : 'Movimentações Consolidadas'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando...</p>
          ) : error ? (
            <p className="text-destructive py-8 text-center">
              Erro ao carregar dados. Tente novamente.
            </p>
          ) : baseFiltered.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum registro encontrado para os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Faixa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baseFiltered.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.data_vencimento)}</TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'Receber' ? 'default' : 'secondary'}>
                          {l.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell>{l.contraparte}</TableCell>
                      <TableCell className="text-right">{brl(l.valor_original)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.situacao}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{FAIXA_LABEL[l.faixa]}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <PerfOverlay
        datasetSize={todasLinhas.length}
        inlineMs={perfStats.inline}
        workerMs={perfStats.worker}
        usedWorker={perfStats.usedWorker}
      />
    </div>
  );
}

// Hub de Relatórios do Financeiro — reúne o consolidado de contas a pagar/
// receber e os 4 relatórios contábeis essenciais (Balanço/DRE/DMPL/DFC) numa
// única tela com abas, em vez de cada um ser um item solto no menu
// Financeiro (pedido explícito do usuário, 2026-09-07). Cada aba renderiza a
// página original em modo `embedded` (sem o próprio título/padding — só o
// conteúdo + botão de exportar), então nada da lógica de cada relatório foi
// duplicada aqui.
export default function RelatoriosFinanceiro() {
  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
          <FileBarChart2 className="h-7 w-7" />
          Relatórios
        </h1>
        <p className="text-muted-foreground">Relatórios financeiros e contábeis, derivados do razão e das contas a pagar/receber.</p>
      </header>

      <Tabs defaultValue="financeiro">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="financeiro">Contas a Pagar/Receber</TabsTrigger>
          <TabsTrigger value="balanco">Balanço Patrimonial</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="dmpl">DMPL</TabsTrigger>
          <TabsTrigger value="dfc">DFC</TabsTrigger>
        </TabsList>
        <TabsContent value="financeiro" className="mt-6">
          <ConsolidadoFinanceiro />
        </TabsContent>
        <TabsContent value="balanco" className="mt-6">
          <BalancoPatrimonial embedded />
        </TabsContent>
        <TabsContent value="dre" className="mt-6">
          <DRE embedded />
        </TabsContent>
        <TabsContent value="dmpl" className="mt-6">
          <DMPL embedded />
        </TabsContent>
        <TabsContent value="dfc" className="mt-6">
          <DFC embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
