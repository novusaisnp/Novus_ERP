import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useExtratos } from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { ExportMenu } from "@/components/relatorios/ExportMenu";
import { useReportBranding } from "@/hooks/useReportBranding";
import { toCsv, downloadCsv, type CsvColumn } from "@/utils/csvExport";
import type { ReportExportPayload } from "@/utils/reportExportShared";
import type { ExtratoImportado } from "@/types/conciliacao";

const money = (n: number | null) =>
  n === null ? "—" : Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function RelatoriosConciliacaoPage() {
  const navigate = useNavigate();
  const { data: extratos, isLoading } = useExtratos();

  const totais = useMemo(() => {
    const list = extratos ?? [];
    return {
      total_extratos: list.length,
      total_lancamentos: list.reduce((s, e) => s + (e.total_lancamentos ?? 0), 0),
      processados: list.filter((e) => e.status === "PROCESSADO").length,
      importados: list.filter((e) => e.status === "IMPORTADO").length,
      erro: list.filter((e) => e.status === "ERRO").length,
    };
  }, [extratos]);

  const { branding } = useReportBranding();
  const rows = extratos ?? [];

  const csvColumns: CsvColumn<ExtratoImportado>[] = [
    { header: "Arquivo", accessor: (r) => r.nome_arquivo },
    { header: "Data Inicial", accessor: (r) => dateFmt(r.data_inicial) },
    { header: "Data Final", accessor: (r) => dateFmt(r.data_final) },
    { header: "Status", accessor: (r) => r.status },
    { header: "Lançamentos", accessor: (r) => r.total_lancamentos },
    { header: "Saldo Inicial", accessor: (r) => money(r.saldo_inicial) },
    { header: "Saldo Final", accessor: (r) => money(r.saldo_final) },
  ];

  const exportPayload: ReportExportPayload<ExtratoImportado> = {
    title: "Relatório de Conciliação Bancária",
    branding,
    filters: [],
    kpis: [
      { label: "Extratos", value: String(totais.total_extratos) },
      { label: "Lançamentos", value: String(totais.total_lancamentos) },
      { label: "Processados", value: String(totais.processados) },
      { label: "Importados", value: String(totais.importados) },
      { label: "Com erro", value: String(totais.erro) },
    ],
    insights: [],
    detail: {
      columns: [
        { header: "Arquivo", accessor: (r) => r.nome_arquivo },
        { header: "Data Inicial", accessor: (r) => dateFmt(r.data_inicial) },
        { header: "Data Final", accessor: (r) => dateFmt(r.data_final) },
        { header: "Status", accessor: (r) => r.status },
        { header: "Lançamentos", accessor: (r) => r.total_lancamentos },
        { header: "Saldo Inicial", accessor: (r) => money(r.saldo_inicial) },
        { header: "Saldo Final", accessor: (r) => money(r.saldo_final) },
      ],
      rows,
    },
    filenameBase: "conciliacao-bancaria",
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <ExportMenu
          payload={exportPayload}
          disabled={rows.length === 0}
          onCsv={() => downloadCsv("conciliacao-bancaria.csv", toCsv(rows, csvColumns))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios de conciliação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Extratos</div>
                <div className="text-2xl font-semibold">{totais.total_extratos}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Lançamentos</div>
                <div className="text-2xl font-semibold">{totais.total_lancamentos}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Processados</div>
                <div className="text-2xl font-semibold">{totais.processados}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Importados</div>
                <div className="text-2xl font-semibold">{totais.importados}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Com erro</div>
                <div className="text-2xl font-semibold text-destructive">{totais.erro}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
