import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useExtrato,
  useLinhasExtrato,
  useSugerirMatches,
  useConfirmarMatch,
  useDesfazerConciliacao,
  useCandidatosMatch,
} from "@/hooks/conciliacao/useConciliacao";
import { conciliacaoService } from "@/services/conciliacao/conciliacaoService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Wand2, CheckCircle2, Undo2, Plus, Search } from "lucide-react";
import type { LinhaExtrato, StatusConciliacao } from "@/types/conciliacao";

const statusVariant: Record<StatusConciliacao, "default" | "secondary" | "destructive" | "outline"> = {
  PENDENTE: "secondary",
  SUGERIDO: "outline",
  CONCILIADO: "default",
  IGNORADO: "destructive",
};

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ConciliacaoExtratoPage() {
  const { extratoId } = useParams<{ extratoId: string }>();
  const navigate = useNavigate();
  const { data: extrato } = useExtrato(extratoId);
  const { data: linhas, isLoading } = useLinhasExtrato(extratoId);
  const sugerir = useSugerirMatches(extratoId);
  const confirmar = useConfirmarMatch(extratoId);
  const desfazer = useDesfazerConciliacao(extratoId);

  const [selected, setSelected] = useState<LinhaExtrato | null>(null);

  const stats = useMemo(() => {
    const total = linhas?.length ?? 0;
    const conc = linhas?.filter((l) => l.status_conciliacao === "CONCILIADO").length ?? 0;
    const sug = linhas?.filter((l) => l.status_conciliacao === "SUGERIDO").length ?? 0;
    const pend = linhas?.filter((l) => l.status_conciliacao === "PENDENTE").length ?? 0;
    return { total, conc, sug, pend };
  }, [linhas]);

  const candidatosQuery = useCandidatosMatch({
    contaBancariaId: selected?.conta_bancaria_id,
    valor: selected?.valor,
    dataMovimento: selected?.data_movimento,
    enabled: !!selected && selected.status_conciliacao !== "CONCILIADO",
  });

  async function handleCriarLancamento(linha: LinhaExtrato) {
    if (!confirm("Criar nova movimentação bancária a partir desta linha?")) return;
    try {
      await conciliacaoService.criarLancamento(linha.id, { descricao: linha.descricao });
      toast({ title: "Lançamento criado e conciliado" });
      sugerir.reset();
      // refetch via invalidação já ocorre no hook do serviço; força reload
      window.location.reload();
    } catch (e) {
      toast({
        title: "Erro ao criar lançamento",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("..")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <Button onClick={() => sugerir.mutate()} disabled={sugerir.isPending} size="sm">
          <Wand2 className="h-4 w-4 mr-2" />
          {sugerir.isPending ? "Processando..." : "Reprocessar match"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {extrato?.nome_arquivo ?? "Extrato"}{" "}
            <Badge variant="outline" className="ml-2">
              {extrato?.formato}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>Total: <span className="text-foreground font-medium">{stats.total}</span></div>
          <div>Conciliadas: <span className="text-foreground font-medium">{stats.conc}</span></div>
          <div>Sugeridas: <span className="text-foreground font-medium">{stats.sug}</span></div>
          <div>Pendentes: <span className="text-foreground font-medium">{stats.pend}</span></div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linhas do extrato</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto divide-y">
                {(linhas ?? []).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                      selected?.id === l.id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          {l.data_movimento} · {l.tipo}
                        </div>
                        <div className="text-sm truncate">{l.descricao}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-medium ${
                            l.valor < 0 ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {fmtMoney(l.valor)}
                        </div>
                        <Badge variant={statusVariant[l.status_conciliacao]} className="text-[10px]">
                          {l.status_conciliacao}
                          {l.score_match != null && ` · ${(l.score_match * 100).toFixed(0)}%`}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Ações e candidatos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">
                Selecione uma linha à esquerda para ver ações e sugestões.
              </p>
            ) : (
              <>
                <div className="text-sm">
                  <div className="font-medium">{selected.descricao}</div>
                  <div className="text-muted-foreground text-xs">
                    {selected.data_movimento} · {fmtMoney(selected.valor)}
                  </div>
                </div>

                {selected.status_conciliacao === "CONCILIADO" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => desfazer.mutate(selected.id)}
                    disabled={desfazer.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-2" /> Desfazer conciliação
                  </Button>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">
                      Candidatos (mesma conta, valor ± tolerância, ±5 dias):
                    </div>
                    {candidatosQuery.isLoading ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (candidatosQuery.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum candidato encontrado.</p>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {(candidatosQuery.data ?? []).map((c) => {
                          const cand = c as {
                            id: string;
                            data_lancamento: string;
                            valor: number;
                            tipo: string;
                            descricao: string;
                          };
                          return (
                            <div
                              key={cand.id}
                              className="flex items-center justify-between gap-2 border rounded-md p-2"
                            >
                              <div className="min-w-0 text-xs">
                                <div className="truncate">{cand.descricao}</div>
                                <div className="text-muted-foreground">
                                  {cand.data_lancamento} · {fmtMoney(cand.valor)} · {cand.tipo}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  confirmar.mutate({ linhaId: selected.id, movimentacaoId: cand.id })
                                }
                                disabled={confirmar.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> Conciliar
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCriarLancamento(selected)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Criar nova movimentação e conciliar
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button variant="link" asChild>
          <Link to="../regras">Configurar regras de conciliação →</Link>
        </Button>
      </div>
    </div>
  );
}
