import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, FileBarChart2 } from 'lucide-react';
import { useVendas } from '@/hooks/useVendas';
import type { VendaStatus, VendaFiltros } from '@/types/vendas';
import { toCsv, downloadCsv } from '@/utils/csvExport';

const STATUS_OPTIONS: Array<{ value: VendaStatus | 'TODOS'; label: string }> = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_PRODUCAO', label: 'Em Produção' },
  { value: 'FATURADO', label: 'Faturado' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

export default function RelatoriosVendas() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [status, setStatus] = useState<VendaStatus | 'TODOS'>('TODOS');

  const filtros: VendaFiltros = useMemo(
    () => ({
      data_inicio: dataInicio || undefined,
      data_fim: dataFim || undefined,
      status: status === 'TODOS' ? undefined : status,
    }),
    [dataInicio, dataFim, status],
  );

  const { vendas, loading } = useVendas(filtros);

  const stats = useMemo(() => {
    const qtd = vendas.length;
    const bruto = vendas.reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0);
    const ticket = qtd > 0 ? bruto / qtd : 0;
    return { qtd, bruto, ticket };
  }, [vendas]);

  const handleExport = () => {
    const csv = toCsv(vendas, [
      { header: 'Data', accessor: (v) => formatDate(v.data_venda) },
      { header: 'Número', accessor: (v) => v.numero_venda || '' },
      { header: 'Cliente', accessor: (v) => v.cliente?.nome || '—' },
      { header: 'Valor Total', accessor: (v) => (Number(v.valor_total) || 0).toFixed(2) },
      { header: 'Status', accessor: (v) => v.status },
    ]);
    downloadCsv(`relatorio-vendas-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7" />
            Relatórios de Vendas
          </h1>
          <p className="text-muted-foreground">Análise consolidada de pedidos de venda.</p>
        </div>
        <Button onClick={handleExport} disabled={loading || vendas.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_inicio">Data início</Label>
            <Input
              id="data_inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_fim">Data fim</Label>
            <Input
              id="data_fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as VendaStatus | 'TODOS')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quantidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.qtd}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Valor Bruto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{brl(stats.bruto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{brl(stats.ticket)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando...</p>
          ) : vendas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum registro encontrado para os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendas.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{formatDate(v.data_venda)}</TableCell>
                      <TableCell>{v.numero_venda || '—'}</TableCell>
                      <TableCell>{v.cliente?.nome || '—'}</TableCell>
                      <TableCell className="text-right">
                        {brl(Number(v.valor_total) || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{v.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
