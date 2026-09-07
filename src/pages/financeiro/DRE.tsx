import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp } from 'lucide-react';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { ContaHierarquicaTable } from '@/components/financeiro/ContaHierarquicaTable';
import { useDre } from '@/hooks/useRelatoriosContabeis';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { currencyUtils } from '@/utils/currencyUtils';
import { linhasParaExibicao } from '@/utils/planoContasTree';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import type { DreContaLinha } from '@/types/relatoriosContabeis';

type Modo = 'SINTETICO' | 'ANALITICO';
const MAX_NIVEL: Record<Modo, number> = { SINTETICO: 1, ANALITICO: Infinity };
const MODO_LABEL: Record<Modo, string> = { SINTETICO: 'Sintético', ANALITICO: 'Analítico' };

const primeiroDiaDoMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const hoje = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

export default function DRE(): JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const [modo, setModo] = useState<Modo>('ANALITICO');
  const { linhas, totalReceita, totalDespesa, resultado, depreciacaoPeriodo, ebitda, isLoading } = useDre(dataInicio, dataFim);
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresa ? [empresa] : []);

  const receita = linhas.filter((l) => l.tipo === 'RECEITA');
  const despesa = linhas.filter((l) => l.tipo === 'DESPESA');

  const linhasExportacao = useMemo(
    () => linhasParaExibicao(linhas, (l: DreContaLinha) => l.valorPeriodo, MAX_NIVEL[modo]),
    [linhas, modo],
  );

  const reportBranding = useMemo(() => {
    if (!empresa) return null;
    return { companyName: empresa.nome, logoUrl: logosMap?.get(empresa.id) ?? null, primaryColor: null };
  }, [empresa, logosMap]);

  const exportPayload: ReportExportPayload<DreContaLinha & { valorExibido: number }> = useMemo(
    () => ({
      title: 'DRE — Demonstração do Resultado do Exercício',
      subtitle: `Período de ${formatDate(dataInicio)} a ${formatDate(dataFim)} — ${MODO_LABEL[modo]}`,
      branding: reportBranding,
      filters: [
        { label: 'Início', value: formatDate(dataInicio) },
        { label: 'Fim', value: formatDate(dataFim) },
        { label: 'Modo', value: MODO_LABEL[modo] },
      ],
      kpis: [
        { label: 'Receita', value: currencyUtils.formatCurrency(totalReceita) },
        { label: 'Despesa', value: currencyUtils.formatCurrency(totalDespesa) },
        { label: 'Resultado do Período', value: currencyUtils.formatCurrency(resultado) },
        { label: 'EBITDA', value: currencyUtils.formatCurrency(ebitda) },
      ],
      insights: [],
      detail: {
        columns: [
          { header: 'Código', accessor: (r) => r.codigo },
          { header: 'Conta', accessor: (r) => r.nome },
          { header: 'Tipo', accessor: (r) => r.tipo },
          { header: 'Valor no Período', accessor: (r) => r.valorExibido, align: 'right' },
        ],
        rows: linhasExportacao,
      },
      filenameBase: `dre-${modo.toLowerCase()}`,
    }),
    [dataInicio, dataFim, modo, reportBranding, totalReceita, totalDespesa, resultado, ebitda, linhasExportacao],
  );

  const handleCsv = () => {
    const cols: CsvColumn<DreContaLinha & { valorExibido: number }>[] = [
      { header: 'Código', accessor: (r) => r.codigo },
      { header: 'Conta', accessor: (r) => r.nome },
      { header: 'Tipo', accessor: (r) => r.tipo },
      { header: 'Valor no Período', accessor: (r) => r.valorExibido.toFixed(2) },
    ];
    downloadCsv(`dre-${modo.toLowerCase()}-${dataInicio}-a-${dataFim}.csv`, toCsv(linhasExportacao, cols));
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <TrendingUp className="h-7 w-7" />
            DRE
          </h1>
          <p className="text-muted-foreground">Demonstração do Resultado do Exercício, derivada do razão contábil.</p>
        </div>
        <ExportMenu payload={exportPayload} onCsv={handleCsv} disabled={isLoading || logosLoading || linhas.length === 0} />
      </header>

      <Card>
        <CardContent className="p-4 flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="dre-inicio">Início</Label>
            <Input id="dre-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dre-fim">Fim</Label>
            <Input id="dre-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-48" />
          </div>
          <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
            <TabsList>
              <TabsTrigger value="SINTETICO">Sintético</TabsTrigger>
              <TabsTrigger value="ANALITICO">Analítico</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-status-delivered">{currencyUtils.formatCurrency(totalReceita)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesa</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-status-cancelled">{currencyUtils.formatCurrency(totalDespesa)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resultado do Período</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${resultado >= 0 ? 'text-status-delivered' : 'text-status-cancelled'}`}>{currencyUtils.formatCurrency(resultado)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">EBITDA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{currencyUtils.formatCurrency(ebitda)}</p>
            <p className="text-xs text-muted-foreground mt-1">Resultado + depreciação/amortização do período ({currencyUtils.formatCurrency(depreciacaoPeriodo)})</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Receitas</CardTitle></CardHeader>
            <CardContent><ContaHierarquicaTable linhas={receita} valorDe={(l) => l.valorPeriodo} maxNivel={MAX_NIVEL[modo]} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Despesas</CardTitle></CardHeader>
            <CardContent><ContaHierarquicaTable linhas={despesa} valorDe={(l) => l.valorPeriodo} maxNivel={MAX_NIVEL[modo]} /></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
