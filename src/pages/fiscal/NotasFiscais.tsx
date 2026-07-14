import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Send, Eye, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import DashboardFiscal from "./DashboardFiscal";
import EmitirNFeDialog from "@/components/fiscal/EmitirNFeDialog";
import DetalheNFeDrawer from "@/components/fiscal/DetalheNFeDrawer";
import FiscalStatusBadge from "@/components/fiscal/FiscalStatusBadge";

interface VendaEmitivel {
  id: string;
  numero_venda: string | number | null;
  cliente_id: string | null;
  valor_total: number | null;
  data_venda: string | null;
  status: string | null;
}
interface DocRow {
  id: string;
  numero: number | null;
  serie: number | null;
  status: string;
  data_emissao: string | null;
  valor_total: number | null;
  chave_acesso: string | null;
  provider: string | null;
  venda_id: string | null;
}
interface MetricRow {
  dia: string;
  provider: string;
  status: string;
  total: number;
  valor_total: number;
}

const currency = (v?: number | null) =>
  typeof v === "number" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const NotasFiscais = () => {
  const [tab, setTab] = useState("dashboard");
  const [emitirVenda, setEmitirVenda] = useState<VendaEmitivel | null>(null);
  const [detalheDocId, setDetalheDocId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  const statusEmissaoFiscal = ["CONFIRMADO", "EM_PRODUCAO", "FATURADO", "ENTREGUE"];

  // ---------- Emitir: vendas elegíveis sem NF vinculada ----------
  const { data: vendasEmitiveis = [], refetch: refetchVendas, isFetching: fetchingVendas } =
    useQuery<VendaEmitivel[]>({
      queryKey: ["fiscal-vendas-emitiveis"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vendas")
          .select("id, numero_venda, cliente_id, valor_total, data_venda, status")
          .in("status", statusEmissaoFiscal)
          .not("cliente_id", "is", null)
          .is("deleted_at", null)
          .order("data_venda", { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data ?? []) as VendaEmitivel[];
      },
    });

  // ---------- Consultar: documentos fiscais ----------
  const { data: documentos = [], refetch: refetchDocs, isFetching: fetchingDocs } =
    useQuery<DocRow[]>({
      queryKey: ["fiscal-documentos", filtroStatus],
      queryFn: async () => {
        let q = supabase
          .from("fiscal_documentos_eletronicos")
          .select("id, numero, serie, status, data_emissao, valor_total, chave_acesso, provider, venda_id")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(200);
        if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []) as DocRow[];
      },
    });

  const documentosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (!term) return documentos;
    return documentos.filter(
      (d) =>
        (d.chave_acesso ?? "").toLowerCase().includes(term) ||
        String(d.numero ?? "").includes(term),
    );
  }, [documentos, busca]);

  // ---------- Relatórios: agregação por dia/provider/status ----------
  const { data: metrics = [] } = useQuery<MetricRow[]>({
    queryKey: ["fiscal-metrics-relatorio"],
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("fiscal_metrics_daily")
        .select("dia, provider, status, total, valor_total")
        .gte("dia", desde)
        .order("dia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const totaisPorStatus = useMemo(() => {
    const map = new Map<string, { total: number; valor: number }>();
    for (const r of metrics) {
      const cur = map.get(r.status) ?? { total: 0, valor: 0 };
      cur.total += r.total;
      cur.valor += Number(r.valor_total ?? 0);
      map.set(r.status, cur);
    }
    return Array.from(map.entries()).map(([status, v]) => ({ status, ...v }));
  }, [metrics]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Emissão, consulta e relatórios de NF-e / NFC-e (modo mock enquanto o provedor real
            não está integrado)
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="emitir">Emitir</TabsTrigger>
          <TabsTrigger value="consultar">Consultar</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        {/* ---------- Dashboard ---------- */}
        <TabsContent value="dashboard" className="pt-4">
          <DashboardFiscal />
        </TabsContent>

        {/* ---------- Emitir ---------- */}
        <TabsContent value="emitir" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendas prontas para emissão</CardTitle>
                <CardDescription>
                  Selecione uma venda confirmada, em produção, faturada ou entregue e emita a NF-e. A emissão roda em modo mock quando
                  <code className="mx-1">FISCAL_MOCK=true</code>.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchVendas()}
                disabled={fetchingVendas}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${fetchingVendas ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {vendasEmitiveis.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-3" />
                  Nenhuma venda elegível pendente de emissão fiscal.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendasEmitiveis.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">
                          {v.numero_venda ?? v.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {v.data_venda ? new Date(v.data_venda).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>{v.status ?? "—"}</TableCell>
                        <TableCell>{currency(v.valor_total)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => setEmitirVenda(v)}>
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Emitir NF-e
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Consultar ---------- */}
        <TabsContent value="consultar" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Notas Fiscais</CardTitle>
              <CardDescription>
                Últimos 200 documentos fiscais. Clique em uma linha para ver detalhes,
                XML/DANFE e eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por número ou chave de acesso"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                  />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="w-full md:w-56">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="autorizada">Autorizadas</SelectItem>
                    <SelectItem value="processando">Processando</SelectItem>
                    <SelectItem value="rejeitada">Rejeitadas</SelectItem>
                    <SelectItem value="denegada">Denegadas</SelectItem>
                    <SelectItem value="cancelada">Canceladas</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => refetchDocs()}
                  disabled={fetchingDocs}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${fetchingDocs ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>

              {documentosFiltrados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="mx-auto h-10 w-10 mb-3" />
                  Nenhum documento fiscal encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº / Série</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentosFiltrados.map((d) => (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetalheDocId(d.id)}>
                        <TableCell className="font-medium">
                          {d.numero ? `${d.numero}/${d.serie ?? 1}` : d.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {d.data_emissao
                            ? new Date(d.data_emissao).toLocaleString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>{d.provider ?? "—"}</TableCell>
                        <TableCell>
                          <FiscalStatusBadge status={d.status} />
                        </TableCell>
                        <TableCell>{currency(d.valor_total)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetalheDocId(d.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------- Relatórios ---------- */}
        <TabsContent value="relatorios" className="pt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {totaisPorStatus.map((r) => (
              <Card key={r.status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground capitalize">
                    {r.status}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{r.total}</p>
                  <p className="text-xs text-muted-foreground">{currency(r.valor)}</p>
                </CardContent>
              </Card>
            ))}
            {totaisPorStatus.length === 0 && (
              <Card className="md:col-span-4">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sem métricas nos últimos 30 dias. Rode o smoke mock no Dashboard para popular.
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento diário</CardTitle>
              <CardDescription>
                Métricas agregadas de <code>fiscal_metrics_daily</code> dos últimos 30 dias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Sem dados disponíveis.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Qtde</TableHead>
                      <TableHead className="text-right">Valor total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m, idx) => (
                      <TableRow key={`${m.dia}-${m.provider}-${m.status}-${idx}`}>
                        <TableCell>{m.dia}</TableCell>
                        <TableCell>{m.provider}</TableCell>
                        <TableCell>
                          <FiscalStatusBadge status={m.status} />
                        </TableCell>
                        <TableCell className="text-right">{m.total}</TableCell>
                        <TableCell className="text-right">{currency(Number(m.valor_total ?? 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmitirNFeDialog
        open={!!emitirVenda}
        onOpenChange={(o) => !o && setEmitirVenda(null)}
        venda={
          emitirVenda
            ? {
                id: emitirVenda.id,
                numero_venda: emitirVenda.numero_venda,
                valor_total: emitirVenda.valor_total,
                data_venda: emitirVenda.data_venda,
              }
            : null
        }
        onEmitida={(docId) => {
          setEmitirVenda(null);
          setDetalheDocId(docId);
          refetchVendas();
          refetchDocs();
        }}
      />

      <DetalheNFeDrawer
        open={!!detalheDocId}
        onOpenChange={(o) => !o && setDetalheDocId(null)}
        documentoId={detalheDocId}
      />
    </div>
  );
};

export default NotasFiscais;
