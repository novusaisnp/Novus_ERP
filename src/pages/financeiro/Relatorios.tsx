import { useMemo, useState } from 'react';
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
import { Download, FileBarChart2 } from 'lucide-react';
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

type Tipo = 'TODOS' | 'RECEBER' | 'PAGAR';
type FinGroupBy = 'nenhum' | 'tipo' | 'situacao' | 'faixa_vencimento';

interface LinhaConsolidada {
  id: string;
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

export default function RelatoriosFinanceiro() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<Tipo>('TODOS');
  const [agrupamento, setAgrupamento] = useState<FinGroupBy>('nenhum');
  const [drill, setDrill] = useState<DrillFilter | null>(null);

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

  const totalReceber = statsReceber?.valor_total_aberto ?? 0;
  const totalPagar = statsPagar?.valor_total_aberto ?? 0;
  const saldo = totalReceber - totalPagar;

  const todasLinhas: LinhaConsolidada[] = useMemo(() => {
    const rows: LinhaConsolidada[] = [];
    if (tipoFiltro === 'TODOS' || tipoFiltro === 'RECEBER') {
      contasReceber.forEach((c) => {
        rows.push({
          id: `r-${c.id}`,
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

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7" />
            Relatórios Financeiros
          </h1>
          <p className="text-muted-foreground">
            Consolidação de contas a pagar e a receber por período.
          </p>
        </div>
        <Button onClick={handleExport} disabled={loading || baseFiltered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </header>

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
        </CardContent>
      </Card>

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
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              {brl(totalReceber)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">
              {brl(totalPagar)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                saldo >= 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-600 dark:text-red-500'
              }`}
            >
              {brl(saldo)}
            </p>
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
    </div>
  );
}
