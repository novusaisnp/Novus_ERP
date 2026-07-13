import { useNavigate } from "react-router-dom";
import { useRegrasConciliacao } from "@/hooks/conciliacao/useConciliacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function RegrasConciliacaoPage() {
  const navigate = useNavigate();
  const { data: regras, isLoading } = useRegrasConciliacao();

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Regras de conciliação</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !regras || regras.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma regra cadastrada. Regras permitem classificar linhas do extrato
              automaticamente (natureza, centro de custo etc.) — cadastro de UI virá em iteração
              futura.
            </p>
          ) : (
            <div className="divide-y">
              {regras.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.nome}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Tipo: {r.tipo} · Prioridade: {r.prioridade}
                      {r.padrao ? ` · Padrão: ${r.padrao}` : ""}
                    </div>
                  </div>
                  <Badge variant={r.ativa ? "default" : "secondary"}>
                    {r.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
