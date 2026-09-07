import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Wallet } from 'lucide-react';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { useDfc } from '@/hooks/useRelatoriosContabeis';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { currencyUtils } from '@/utils/currencyUtils';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import type { DfcResultado } from '@/types/relatoriosContabeis';

const primeiroDiaDoMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const hoje = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

interface DfcLinha {
  secao: string;
  label: string;
  valor: number;
  isSubtotal?: boolean;
}

function linhasDe(dfc: DfcResultado): DfcLinha[] {
  return [
    { secao: 'Atividades Operacionais', label: 'Resultado do Período', valor: dfc.resultadoPeriodo },
    { secao: 'Atividades Operacionais', label: '(+) Depreciação e Amortização', valor: dfc.depreciacaoAmortizacao },
    { secao: 'Atividades Operacionais', label: '(-) Variação em Contas a Receber', valor: -dfc.variacaoContasReceber },
    { secao: 'Atividades Operacionais', label: '(+) Variação em Contas a Pagar', valor: dfc.variacaoContasPagar },
    { secao: 'Atividades Operacionais', label: 'Fluxo de Caixa Operacional', valor: dfc.fluxoOperacional, isSubtotal: true },
    { secao: 'Atividades de Investimento', label: '(-) Variação em Imobilizado', valor: -dfc.variacaoImobilizado },
    { secao: 'Atividades de Investimento', label: 'Fluxo de Caixa de Investimento', valor: dfc.fluxoInvestimento, isSubtotal: true },
    { secao: 'Atividades de Financiamento', label: 'Variação em Patrimônio Líquido (capital)', valor: dfc.fluxoFinanciamento },
    { secao: 'Atividades de Financiamento', label: 'Fluxo de Caixa de Financiamento', valor: dfc.fluxoFinanciamento, isSubtotal: true },
  ];
}

interface Props {
  embedded?: boolean;
}

export default function DFC({ embedded = false }: Props = {}): JSX.Element {
  const [dataInicio, setDataInicio] = useState(primeiroDiaDoMes());
  const [dataFim, setDataFim] = useState(hoje());
  const { dfc, isLoading } = useDfc(dataInicio, dataFim);
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresa ? [empresa] : []);

  const linhas = useMemo(() => (dfc ? linhasDe(dfc) : []), [dfc]);
  const fecha = dfc ? Math.abs(dfc.variacaoCaixaDfc - dfc.variacaoCaixaBalanco) < 0.01 : false;

  const reportBranding = useMemo(() => {
    if (!empresa) return null;
    return { companyName: empresa.nome, logoUrl: logosMap?.get(empresa.id) ?? null, primaryColor: null };
  }, [empresa, logosMap]);

  const exportPayload: ReportExportPayload<DfcLinha> = useMemo(
    () => ({
      title: 'DFC — Demonstração do Fluxo de Caixa (Método Indireto)',
      subtitle: `Período de ${formatDate(dataInicio)} a ${formatDate(dataFim)}`,
      branding: reportBranding,
      filters: [
        { label: 'Início', value: formatDate(dataInicio) },
        { label: 'Fim', value: formatDate(dataFim) },
      ],
      kpis: dfc
        ? [
            { label: 'Saldo de Caixa Inicial', value: currencyUtils.formatCurrency(dfc.saldoCaixaInicial) },
            { label: 'Variação de Caixa no Período', value: currencyUtils.formatCurrency(dfc.variacaoCaixaDfc) },
            { label: 'Saldo de Caixa Final', value: currencyUtils.formatCurrency(dfc.saldoCaixaFinal) },
          ]
        : [],
      insights: fecha
        ? []
        : [{ severity: 'critical', title: 'DFC não fecha', description: 'A variação de caixa calculada pelo DFC diverge do saldo real da conta Caixa e Bancos — reporte esta divergência.' }],
      detail: {
        columns: [
          { header: 'Seção', accessor: (r) => r.secao },
          { header: 'Linha', accessor: (r) => r.label },
          { header: 'Valor', accessor: (r) => r.valor, align: 'right' },
        ],
        rows: linhas,
      },
      filenameBase: 'dfc',
    }),
    [dataInicio, dataFim, reportBranding, dfc, fecha, linhas],
  );

  const handleCsv = () => {
    const cols: CsvColumn<DfcLinha>[] = [
      { header: 'Seção', accessor: (r) => r.secao },
      { header: 'Linha', accessor: (r) => r.label },
      { header: 'Valor', accessor: (r) => r.valor.toFixed(2) },
    ];
    downloadCsv(`dfc-${dataInicio}-a-${dataFim}.csv`, toCsv(linhas, cols));
  };

  const secoes = ['Atividades Operacionais', 'Atividades de Investimento', 'Atividades de Financiamento'];

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        {embedded ? (
          <div />
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Wallet className="h-7 w-7" />
              DFC
            </h1>
            <p className="text-muted-foreground">Demonstração do Fluxo de Caixa (método indireto), derivada do razão contábil.</p>
          </div>
        )}
        <ExportMenu payload={exportPayload} onCsv={handleCsv} disabled={isLoading || logosLoading || !dfc} />
      </header>

      <Card>
        <CardContent className="p-4 flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="dfc-inicio">Início</Label>
            <Input id="dfc-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dfc-fim">Fim</Label>
            <Input id="dfc-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-48" />
          </div>
          {dfc && (
            <Badge variant={fecha ? 'default' : 'destructive'}>
              {fecha ? 'DFC fecha com o Balanço' : 'DFC não fecha — divergência'}
            </Badge>
          )}
        </CardContent>
      </Card>

      {isLoading || !dfc ? (
        <p className="text-muted-foreground py-8 text-center">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo de Caixa Inicial</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(dfc.saldoCaixaInicial)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Variação de Caixa no Período</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${dfc.variacaoCaixaDfc >= 0 ? 'text-status-delivered' : 'text-status-cancelled'}`}>{currencyUtils.formatCurrency(dfc.variacaoCaixaDfc)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo de Caixa Final</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(dfc.saldoCaixaFinal)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Demonstração</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {secoes.map((secao) => (
                    <React.Fragment key={secao}>
                      <TableRow>
                        <TableCell colSpan={2} className="font-semibold bg-muted/50">{secao}</TableCell>
                      </TableRow>
                      {linhas.filter((l) => l.secao === secao).map((l) => (
                        <TableRow key={l.label}>
                          <TableCell className={l.isSubtotal ? 'font-semibold pl-6' : 'pl-6 text-muted-foreground'}>{l.label}</TableCell>
                          <TableCell className={`text-right ${l.isSubtotal ? 'font-semibold' : ''}`}>{currencyUtils.formatCurrency(l.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                  <TableRow>
                    <TableCell className="font-bold">Variação de Caixa no Período</TableCell>
                    <TableCell className="text-right font-bold">{currencyUtils.formatCurrency(dfc.variacaoCaixaDfc)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
