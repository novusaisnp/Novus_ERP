import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scale } from 'lucide-react';
import { ExportMenu } from '@/components/relatorios/ExportMenu';
import { ContaHierarquicaTable } from '@/components/financeiro/ContaHierarquicaTable';
import { useBalancoPatrimonial } from '@/hooks/useRelatoriosContabeis';
import { useEmpresaRepresentadaAtual } from '@/hooks/useEmpresaRepresentadaAtual';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { currencyUtils } from '@/utils/currencyUtils';
import { linhasParaExibicao } from '@/utils/planoContasTree';
import { toCsv, downloadCsv, type CsvColumn } from '@/utils/csvExport';
import type { ReportExportPayload } from '@/utils/reportExportShared';
import type { BalancoContaLinha } from '@/types/relatoriosContabeis';

type Modo = 'SINTETICO' | 'ANALITICO';
const MAX_NIVEL: Record<Modo, number> = { SINTETICO: 1, ANALITICO: Infinity };
const MODO_LABEL: Record<Modo, string> = { SINTETICO: 'Sintético', ANALITICO: 'Analítico' };

const hoje = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

interface Props {
  /** Renderizado dentro de uma aba do hub de Relatórios — sem padding/título
   * próprios (o hub já fornece), mas mantém o botão de exportar. */
  embedded?: boolean;
}

export default function BalancoPatrimonial({ embedded = false }: Props = {}): JSX.Element {
  const [dataCorte, setDataCorte] = useState(hoje());
  const [modo, setModo] = useState<Modo>('ANALITICO');
  const { linhas, isLoading } = useBalancoPatrimonial(dataCorte);
  const { data: empresa } = useEmpresaRepresentadaAtual();
  const { data: logosMap, isLoading: logosLoading } = useEmpresasLogosMap(empresa ? [empresa] : []);

  const ativo = linhas.filter((l) => l.tipo === 'ATIVO');
  const passivo = linhas.filter((l) => l.tipo === 'PASSIVO');
  const patrimonio = linhas.filter((l) => l.tipo === 'PATRIMONIO');

  // Total por grupo = soma direta de todas as contas daquele tipo (folhas +
  // headers, que sempre têm saldo próprio 0) — não precisa andar a árvore,
  // já é o mesmo total que a prova em SQL valida. Independe do modo
  // sintético/analítico, que só controla até que nível a UI/exportação desce.
  const totalAtivo = ativo.reduce((acc, l) => acc + l.saldo, 0);
  const totalPassivo = passivo.reduce((acc, l) => acc + l.saldo, 0);
  const totalPatrimonio = patrimonio.reduce((acc, l) => acc + l.saldo, 0);
  const fecha = Math.abs(totalAtivo - (totalPassivo + totalPatrimonio)) < 0.01;

  const linhasExportacao = useMemo(
    () => linhasParaExibicao(linhas, (l: BalancoContaLinha) => l.saldo, MAX_NIVEL[modo]),
    [linhas, modo],
  );

  const reportBranding = useMemo(() => {
    if (!empresa) return null;
    return {
      companyName: empresa.nome,
      logoUrl: logosMap?.get(empresa.id) ?? null,
      primaryColor: null,
    };
  }, [empresa, logosMap]);

  const exportPayload: ReportExportPayload<BalancoContaLinha & { valorExibido: number }> = useMemo(
    () => ({
      title: 'Balanço Patrimonial',
      subtitle: `Posição em ${formatDate(dataCorte)} — ${MODO_LABEL[modo]}`,
      branding: reportBranding,
      filters: [
        { label: 'Data de corte', value: formatDate(dataCorte) },
        { label: 'Modo', value: MODO_LABEL[modo] },
      ],
      kpis: [
        { label: 'Total do Ativo', value: currencyUtils.formatCurrency(totalAtivo) },
        { label: 'Total do Passivo', value: currencyUtils.formatCurrency(totalPassivo) },
        { label: 'Patrimônio Líquido', value: currencyUtils.formatCurrency(totalPatrimonio) },
      ],
      insights: fecha
        ? []
        : [{ severity: 'critical', title: 'Balanço não fecha', description: 'Ativo diferente de Passivo + Patrimônio Líquido — reporte esta divergência.' }],
      detail: {
        columns: [
          { header: 'Código', accessor: (r) => r.codigo },
          { header: 'Conta', accessor: (r) => r.nome },
          { header: 'Tipo', accessor: (r) => r.tipo },
          { header: 'Saldo', accessor: (r) => r.valorExibido, align: 'right' },
        ],
        rows: linhasExportacao,
      },
      filenameBase: `balanco-patrimonial-${modo.toLowerCase()}`,
    }),
    [dataCorte, modo, reportBranding, totalAtivo, totalPassivo, totalPatrimonio, fecha, linhasExportacao],
  );

  const handleCsv = () => {
    const cols: CsvColumn<BalancoContaLinha & { valorExibido: number }>[] = [
      { header: 'Código', accessor: (r) => r.codigo },
      { header: 'Conta', accessor: (r) => r.nome },
      { header: 'Tipo', accessor: (r) => r.tipo },
      { header: 'Saldo', accessor: (r) => r.valorExibido.toFixed(2) },
    ];
    downloadCsv(`balanco-patrimonial-${modo.toLowerCase()}-${dataCorte}.csv`, toCsv(linhasExportacao, cols));
  };

  return (
    <div className={embedded ? 'space-y-6' : 'p-6 space-y-6'}>
      <header className="flex items-center justify-between gap-4 flex-wrap">
        {embedded ? (
          <div />
        ) : (
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Scale className="h-7 w-7" />
              Balanço Patrimonial
            </h1>
            <p className="text-muted-foreground">Posição patrimonial derivada diretamente do razão contábil.</p>
          </div>
        )}
        <ExportMenu payload={exportPayload} onCsv={handleCsv} disabled={isLoading || logosLoading || linhas.length === 0} />
      </header>

      <Card>
        <CardContent className="p-4 flex items-end gap-4 flex-wrap">
          <div className="space-y-2">
            <Label htmlFor="data-corte">Data de corte</Label>
            <Input id="data-corte" type="date" value={dataCorte} onChange={(e) => setDataCorte(e.target.value)} className="w-48" />
          </div>
          <Tabs value={modo} onValueChange={(v) => setModo(v as Modo)}>
            <TabsList>
              <TabsTrigger value="SINTETICO">Sintético</TabsTrigger>
              <TabsTrigger value="ANALITICO">Analítico</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant={fecha ? 'default' : 'destructive'}>
            {fecha ? 'Balanço fechado (Ativo = Passivo + PL)' : 'Balanço não fecha — divergência'}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do Ativo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalAtivo)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total do Passivo</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalPassivo)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Patrimônio Líquido</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currencyUtils.formatCurrency(totalPatrimonio)}</p></CardContent>
        </Card>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Carregando…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ativo</CardTitle></CardHeader>
            <CardContent><ContaHierarquicaTable linhas={ativo} valorDe={(l) => l.saldo} maxNivel={MAX_NIVEL[modo]} /></CardContent>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Passivo</CardTitle></CardHeader>
              <CardContent><ContaHierarquicaTable linhas={passivo} valorDe={(l) => l.saldo} maxNivel={MAX_NIVEL[modo]} /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Patrimônio Líquido</CardTitle></CardHeader>
              <CardContent><ContaHierarquicaTable linhas={patrimonio} valorDe={(l) => l.saldo} maxNivel={MAX_NIVEL[modo]} /></CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
