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
import { useContasPagar } from '@/hooks/useContasPagar';
import { useContasReceber } from '@/hooks/useContasReceber';
import { toCsv, downloadCsv } from '@/utils/csvExport';

type Tipo = 'TODOS' | 'RECEBER' | 'PAGAR';

interface LinhaConsolidada {
  id: string;
  data_vencimento: string;
  tipo: 'Receber' | 'Pagar';
  descricao: string;
  contraparte: string;
  valor_original: number;
  situacao: string;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

export default function RelatoriosFinanceiro() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipo, setTipo] = useState<Tipo>('TODOS');

  const filtros = useMemo(
    () => ({
      data_vencimento_inicio: dataInicio || undefined,
      data_vencimento_fim: dataFim || undefined,
    }),
    [dataInicio, dataFim],
  );

  const {
    contasPagar,
    estatisticas: statsPagar,
    isLoading: loadingPagar,
    error: errPagar,
  } = useContasPagar(filtros);
  const {
    contasReceber,
    estatisticas: statsReceber,
    isLoading: loadingReceber,
    error: errReceber,
  } = useContasReceber(filtros);

  const totalReceber = statsReceber?.valor_total_aberto ?? 0;
  const totalPagar = statsPagar?.valor_total_aberto ?? 0;
  const saldo = totalReceber - totalPagar;

  const linhas: LinhaConsolidada[] = useMemo(() => {
    const rows: LinhaConsolidada[] = [];
    if (tipo === 'TODOS' || tipo === 'RECEBER') {
      contasReceber.forEach((c) => {
        rows.push({
          id: `r-${c.id}`,
          data_vencimento: c.data_vencimento,
          tipo: 'Receber',
          descricao: c.descricao,
          contraparte: c.cliente?.nome || '—',
          valor_original: Number(c.valor_original) || 0,
          situacao: c.status,
        });
      });
    }
    if (tipo === 'TODOS' || tipo === 'PAGAR') {
      contasPagar.forEach((c) => {
        rows.push({
          id: `p-${c.id}`,
          data_vencimento: c.data_vencimento,
          tipo: 'Pagar',
          descricao: c.descricao,
          contraparte: c.fornecedor?.razao_social || '—',
          valor_original: Number(c.valor_original) || 0,
          situacao: c.situacao,
        });
      });
    }
    return rows.sort((a, b) => (a.data_vencimento < b.data_vencimento ? -1 : 1));
  }, [contasPagar, contasReceber, tipo]);

  const loading = loadingPagar || loadingReceber;
  const error = errPagar || errReceber;

  const handleExport = () => {
    const csv = toCsv(linhas, [
      { header: 'Vencimento', accessor: (r) => formatDate(r.data_vencimento) },
      { header: 'Tipo', accessor: (r) => r.tipo },
      { header: 'Descrição', accessor: (r) => r.descricao },
      { header: 'Contraparte', accessor: (r) => r.contraparte },
      { header: 'Valor Original', accessor: (r) => r.valor_original.toFixed(2) },
      { header: 'Situação', accessor: (r) => r.situacao },
    ]);
    downloadCsv(`relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7" />
            Relatórios Financeiros
          </h1>
          <p className="text-muted-foreground">
            Consolidação de contas a pagar e a receber por período.
          </p>
        </div>
        <Button onClick={handleExport} disabled={loading || linhas.length === 0}>
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
            <Label htmlFor="ini">Vencimento início</Label>
            <Input
              id="ini"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Vencimento fim</Label>
            <Input
              id="fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="RECEBER">A Receber</SelectItem>
                <SelectItem value="PAGAR">A Pagar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total a Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              {brl(totalReceber)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total a Pagar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-500">
              {brl(totalPagar)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                saldo >= 0
                  ? 'text-green-600 dark:text-green-500'
                  : 'text-red-600 dark:text-red-500'
              }`}
            >
              {brl(saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimentações Consolidadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">Carregando...</p>
          ) : error ? (
            <p className="text-destructive py-8 text-center">
              Erro ao carregar dados. Tente novamente.
            </p>
          ) : linhas.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhum registro encontrado para os filtros aplicados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contraparte</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDate(l.data_vencimento)}</TableCell>
                      <TableCell>
                        <Badge variant={l.tipo === 'Receber' ? 'default' : 'secondary'}>
                          {l.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{l.descricao}</TableCell>
                      <TableCell>{l.contraparte}</TableCell>
                      <TableCell className="text-right">{brl(l.valor_original)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.situacao}</Badge>
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
