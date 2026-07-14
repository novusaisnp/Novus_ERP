import { useMemo, useState } from "react";
import { FileText, TrendingUp, XCircle, Clock, RefreshCw, PlayCircle, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface MetricRow {
  dia: string;
  provider: string;
  status: string;
  total: number;
  valor_total: number;
  latencia_media_s: number | null;
}

interface DocEmProc {
  id: string;
  numero: number | null;
  serie: number | null;
  status: string;
  data_emissao: string | null;
  provider: string | null;
  venda_id: string | null;
}
interface AlertaAtivo {
  id: string;
  kind: string;
  severity: string;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


const DashboardFiscal = () => {
  const { data: metrics = [] } = useQuery<MetricRow[]>({
    queryKey: ['fiscal-metrics-daily'],
    staleTime: 60_000,
    queryFn: async () => {
      const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('fiscal_metrics_daily')
        .select('dia, provider, status, total, valor_total, latencia_media_s')
        .gte('dia', desde)
        .order('dia', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });

  const { data: processando = [] } = useQuery<DocEmProc[]>({
    queryKey: ['fiscal-processando'],
    refetchInterval: 30_000,
    queryFn: async () => {
      const limite = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('fiscal_documentos_eletronicos')
        .select('id, numero, serie, status, data_emissao, provider, venda_id')
        .eq('status', 'processando')
        .lt('created_at', limite)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as DocEmProc[];
    },
  });

  const kpis = useMemo(() => {
    const total = metrics.reduce((a, r) => a + r.total, 0);
    const autorizadas = metrics.filter((r) => r.status === 'autorizada').reduce((a, r) => a + r.total, 0);
    const rejeitadas = metrics.filter((r) => ['rejeitada', 'denegada', 'erro'].includes(r.status)).reduce((a, r) => a + r.total, 0);
    const valorTotal = metrics.filter((r) => r.status === 'autorizada').reduce((a, r) => a + Number(r.valor_total ?? 0), 0);
    const taxa = total > 0 ? (autorizadas / total) * 100 : 0;
    const ticket = autorizadas > 0 ? valorTotal / autorizadas : 0;
    return { total, autorizadas, rejeitadas, valorTotal, taxa, ticket };
  }, [metrics]);
  const [reprocessando, setReprocessando] = useState<string | null>(null);
  const [smokeVendaId, setSmokeVendaId] = useState<string>("");
  const [smokeRunning, setSmokeRunning] = useState(false);

  const { data: alertasAtivos = [], refetch: refetchAlertas } = useQuery<AlertaAtivo[]>({
    queryKey: ['fiscal-alertas-ativos'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_ops_alerts')
        .select('id, kind, severity, reason, payload, created_at')
        .is('resolved_at', null)
        .like('kind', 'fiscal_%')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AlertaAtivo[];
    },
  });

  const reprocessar = async (doc: DocEmProc) => {
    if (!doc.venda_id) {
      toast.error('Documento sem venda vinculada — não é possível reprocessar automaticamente.');
      return;
    }
    setReprocessando(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-emitir-nfe', {
        body: { vendaId: doc.venda_id },
      });
      if (error) throw error;
      toast.success(`Reprocessamento disparado (${data?.status ?? 'ok'}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao reprocessar.';
      toast.error(msg);
    } finally {
      setReprocessando(null);
    }
  };

  const rodarSmoke = async () => {
    const vendaId = smokeVendaId.trim();
    if (!vendaId) {
      toast.error('Informe o ID de uma venda faturada para o smoke test.');
      return;
    }
    setSmokeRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-smoke-run', {
        body: { vendaId },
      });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      if (!d?.ok) {
        toast.error(`Smoke falhou na etapa "${d?.step ?? '?'}".`);
      } else {
        toast.success(`Smoke concluído — documento ${d.documento_id?.slice(0, 8) ?? '?'}`);
      }
      refetchAlertas();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao rodar smoke.';
      toast.error(msg);
    } finally {
      setSmokeRunning(false);
    }
  };

  const severityVariant = (s: string): 'destructive' | 'secondary' =>
    s === 'page' ? 'destructive' : 'secondary';


  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Dashboard Fiscal</h1>
        <p className="text-muted-foreground">Últimos 30 dias — métricas de NF-e</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4" /> Emitidas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{kpis.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Taxa autorização</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{kpis.taxa.toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Rejeições</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{kpis.rejeitadas}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{currency(kpis.ticket)}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Em processamento há mais de 10 min
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processando.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum documento pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processando.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.numero ? `${d.numero}/${d.serie}` : d.id.slice(0, 8)}</TableCell>
                    <TableCell>{d.data_emissao ? new Date(d.data_emissao).toLocaleString('pt-BR') : '—'}</TableCell>
                    <TableCell>{d.provider ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{d.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reprocessar(d)}
                        disabled={reprocessando === d.id || !d.venda_id}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reprocessando === d.id ? 'animate-spin' : ''}`} />
                        Reprocessar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardFiscal;
