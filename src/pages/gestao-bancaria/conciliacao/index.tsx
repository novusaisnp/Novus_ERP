import { Link } from "react-router-dom";
import { useExtratos } from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUp, Settings, BarChart3, ArrowRight, Undo2 } from "lucide-react";
import { useReverterExtrato } from "@/hooks/conciliacao/useConciliacao";
import type { StatusExtrato } from "@/types/conciliacao";

const statusVariant: Record<StatusExtrato, "default" | "secondary" | "destructive" | "outline"> = {
  IMPORTADO: "secondary",
  PROCESSADO: "default",
  ERRO: "destructive",
  REVERTIDO: "outline",
};

export default function ConciliacaoIndex() {
  const { data: extratos, isLoading } = useExtratos();
  const reverter = useReverterExtrato();

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conciliação Bancária</h1>
          <p className="text-muted-foreground text-sm">
            Importe extratos, valide sugestões automáticas e concilie manualmente.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link to="regras">
              <Settings className="h-4 w-4 mr-2" /> Regras
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="relatorios">
              <BarChart3 className="h-4 w-4 mr-2" /> Relatórios
            </Link>
          </Button>
          <Button asChild>
            <Link to="importar">
              <FileUp className="h-4 w-4 mr-2" /> Importar extrato
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Extratos importados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !extratos || extratos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Nenhum extrato importado ainda.
            </div>
          ) : (
            <div className="divide-y">
              {extratos.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.nome_arquivo}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.formato} · {e.total_lancamentos} lançamentos ·{" "}
                      {e.data_inicial ?? "—"} → {e.data_final ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[e.status]}>{e.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Reverter (excluir) esse extrato?")) reverter.mutate(e.id);
                      }}
                      disabled={reverter.isPending}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to={e.id}>
                        Abrir <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
