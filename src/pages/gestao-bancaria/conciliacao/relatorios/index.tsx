import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useExtratos } from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

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
