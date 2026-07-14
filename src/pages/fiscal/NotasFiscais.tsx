import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Eye, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FiscalStatusBadge from '@/components/fiscal/FiscalStatusBadge';
import DetalheNFeDrawer from '@/components/fiscal/DetalheNFeDrawer';

console.log('[Fiscal] Inicializando página de Notas Fiscais');

interface DocRow {
  id: string;
  numero: number | null;
  serie: number | null;
  status: string;
  data_emissao: string | null;
  valor_total: number | null;
  chave_acesso: string | null;
  provider: string | null;
  ambiente: string | null;
  venda_id: string | null;
}

const currency = (v: number | null) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';

const NotasFiscais: React.FC = () => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [detalheId, setDetalheId] = useState<string | null>(null);

  const { data: docs = [], isLoading, refetch, isFetching } = useQuery<DocRow[]>({
    queryKey: ['fiscal-documentos', 'list'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_documentos_eletronicos')
        .select('id, numero, serie, status, data_emissao, valor_total, chave_acesso, provider, ambiente, venda_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as DocRow[];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) =>
        String(d.numero ?? '').includes(q) ||
        (d.chave_acesso ?? '').toLowerCase().includes(q) ||
        (d.status ?? '').toLowerCase().includes(q),
    );
  }, [docs, busca]);

  const kpis = useMemo(() => {
    const total = docs.length;
    const autorizadas = docs.filter((d) => d.status === 'autorizada').length;
    const processando = docs.filter((d) => d.status === 'processando').length;
    const rejeitadas = docs.filter((d) => ['rejeitada', 'denegada', 'erro'].includes(d.status)).length;
    const valorTotal = docs
      .filter((d) => d.status === 'autorizada')
      .reduce((a, d) => a + Number(d.valor_total ?? 0), 0);
    return { total, autorizadas, processando, rejeitadas, valorTotal };
  }, [docs]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais</h1>
          <p className="text-muted-foreground">
            Documentos fiscais eletrônicos emitidos pelo sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => navigate('/vendas/pedidos')}>
            <FileText className="h-4 w-4 mr-2" />
            Emitir a partir de Venda
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="consultar">Consultar</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Autorizadas</p>
                <p className="text-2xl font-bold text-primary">{kpis.autorizadas}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Processando</p>
                <p className="text-2xl font-bold">{kpis.processando}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Rejeitadas</p>
                <p className="text-2xl font-bold text-destructive">{kpis.rejeitadas}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Últimas notas</CardTitle>
              <CardDescription>10 documentos mais recentes</CardDescription>
            </CardHeader>
            <CardContent>
              {docs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum documento fiscal emitido ainda. Emita a partir de uma venda.
                </p>
              ) : (
                <div className="space-y-2">
                  {docs.slice(0, 10).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              NF-e {d.numero ?? '—'}/{d.serie ?? '—'}
                            </span>
                            <FiscalStatusBadge status={d.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {d.data_emissao ? new Date(d.data_emissao).toLocaleString('pt-BR') : 'Sem data'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{currency(d.valor_total)}</span>
                        <Button size="sm" variant="ghost" onClick={() => setDetalheId(d.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultar documentos</CardTitle>
              <CardDescription>Busque por número, chave de acesso ou status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Ex.: 123, 3524..., autorizada"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : filtrados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum documento encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ambiente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          {d.numero ? `${d.numero}/${d.serie}` : d.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {d.data_emissao ? new Date(d.data_emissao).toLocaleString('pt-BR') : '—'}
                        </TableCell>
                        <TableCell>
                          <FiscalStatusBadge status={d.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.ambiente ?? '—'} · {d.provider ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">{currency(d.valor_total)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetalheId(d.id)} title="Detalhes">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {d.venda_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/vendas/pedidos`)}
                                title="Ver venda"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            {d.chave_acesso && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(d.chave_acesso!);
                                  toast.success('Chave de acesso copiada.');
                                }}
                                title="Copiar chave"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DetalheNFeDrawer
        open={!!detalheId}
        onOpenChange={(o) => { if (!o) setDetalheId(null); }}
        documentoId={detalheId}
      />
    </div>
  );
};

export default NotasFiscais;
