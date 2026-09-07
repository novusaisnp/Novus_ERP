import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart } from 'lucide-react';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { DmplTable } from '@/components/financeiro/DmplTable';
import { useDmpl } from '@/hooks/useRelatoriosContabeis';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { currencyUtils } from '@/utils/currencyUtils';
import { linhasParaExibicao } from '@/utils/planoContasTree';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import type { DmplContaLinha } from '@/types/relatoriosContabeis';

type Modo = 'SINTETICO' | 'ANALITICO';
const MAX_NIVEL: Record<Modo, number> = { SINTETICO: 1, ANALITICO: Infinity };
const MODO_LABEL: Record<Modo, string> = { SINTETICO: 'Sintético', ANALITICO: 'Analítico' };

const primeiroDiaDoMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const hoje = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

interface DmplExportRow {
  codigo: string;
  nome: string;
  saldoInicial: number;
  movimentoPeriodo: number;
  saldoFinal: number;
}

interface Props {
  embedded?: boolean;
}

export default function DMPL({ embedded = false }: Props = {}): JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const [modo, setModo] = useState<Modo>('ANALITICO');
  const { linhas, totalSaldoInicial, totalMovimento, totalSaldoFinal, isLoading } = useDmpl(dataInicio, dataFim);
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresa ? [empresa] : []);

  const linhasExportacao: DmplExportRow[] = useMemo(() => {
    const iniciais = linhasParaExibicao(linhas, (l: DmplContaLinha) => l.saldoInicial, MAX_NIVEL[modo]);
    const movimentos = linhasParaExibicao(linhas, (l: DmplContaLinha) => l.movimentoPeriodo, MAX_NIVEL[modo]);
    const finais = linhasParaExibicao(linhas, (l: DmplContaLinha) => l.saldoFinal, MAX_NIVEL[modo]);
    return iniciais.map((l, i) => ({
      codigo: l.codigo,
      nome: l.nome,
      saldoInicial: l.valorExibido,
      movimentoPeriodo: movimentos[i].valorExibido,
      saldoFinal: finais[i].valorExibido,
    }));
  }, [linhas, modo]);

  const reportBranding = useMemo(() => {
    if (!empresa) return null;
    return { companyName: empresa.nome, logoUrl: logosMap?.get(empresa.id) ?? null, primaryColor: null };
  }, [empresa, logosMap]);

  const exportPayload: ReportExportPayload<DmplExportRow> = useMemo(
    () => ({
      title: 'DMPL — Demonstração das Mutações do Patrimônio Líquido',
      subtitle: `Período de ${formatDate(dataInicio)} a ${formatDate(dataFim)} — ${MODO_LABEL[modo]}`,
      branding: reportBranding,
      filters: [
        { label: 'Início', value: formatDate(dataInicio) },
        { label: 'Fim', value: formatDate(dataFim) },
        { label: 'Modo', value: MODO_LABEL[modo] },
      ],
      kpis: [
        { label: 'Saldo Inicial do PL', value: currencyUtils.formatCurrency(totalSaldoInicial) },
        { label: 'Movimento do Período', value: currencyUtils.formatCurrency(totalMovimento) },
        { label: 'Saldo Final do PL', value: currencyUtils.formatCurrency(totalSaldoFinal) },
      ],
      insights: [],
      detail: {
        columns: [
          { header: 'Código', accessor: (r) => r.codigo },
          { header: 'Conta', accessor: (r) => r.nome },
          { header: 'Saldo Inicial', accessor: (r) => r.saldoInicial, align: 'right' },
          { header: 'Movimento do Período', accessor: (r) => r.movimentoPeriodo, align: 'right' },
          { header: 'Saldo Final', accessor: (r) => r.saldoFinal, align: 'right' },
        ],
        rows: linhasExportacao,
      },
      filenameBase: `dmpl-${modo.toLowerCase()}`,
    }),
    [dataInicio, dataFim, modo, reportBranding, totalSaldoInicial, totalMovimento, totalSaldoFinal, linhasExportacao],
  );

  const handleCsv = () => {
    const cols: CsvColumn<DmplExportRow>[] = [
      { header: 'Código', accessor: (r) => r.codigo },
      { header: 'Conta', accessor: (r) => r.nome },
      { header: 'Saldo Inicial', accessor: (r) => r.saldoInicial.toFixed(2) },
      { header: 'Movimento do Período', accessor: (r) => r.movimentoPeriodo.toFixed(2) },
      { header: 'Saldo Final', accessor: (r) => r.saldoFinal.toFixed(2) },
    ];
    downloadCsv(`dmpl-${modo.toLowerCase()}-${dataInicio}-a-${dataFim}.csv`, toCsv(linhasExportacao, cols));
  };

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        {embedded ? (
          <div />
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <LineChart className="h-7 w-7" />
              DMPL
            </h1>
            <p className="text-muted-foreground">Demonstração das Mutações do Patrimônio Líquido, derivada do razão contábil.</p>
          </div>
        )}
        <ExportMenu payload={exportPayload} onCsv={handleCsv} disabled={isLoading || logosLoading || linhas.length === 0} />
      </header>

      <Card>
        <CardContent className="p-4 flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="dmpl-inicio">Início</Label>
            <Input id="dmpl-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dmpl-fim">Fim</Label>
            <Input id="dmpl-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-48" />
          </div>
          <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
            <TabsList>
              <TabsTrigger value="SINTETICO">Sintético</TabsTrigger>
              <TabsTrigger value="ANALITICO">Analítico</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Inicial do PL</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalSaldoInicial)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Movimento do Período</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalMovimento)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo Final do PL</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalSaldoFinal)}</p></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Carregando…</p>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Patrimônio Líquido</CardTitle></CardHeader>
          <CardContent><DmplTable linhas={linhas} maxNivel={MAX_NIVEL[modo]} /></CardContent>
        </Card>
      )}
    </div>
  );
}
