// P14.2: Relatório Produtos Parados
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Timer } from 'lucide-react';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useRelatorioParados } from '@/hooks/estoque/useRelatoriosEstoque';
import { downloadCsv, rowsToCsv } from '@/services/estoque/relatoriosService';

const money = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ParadosPage: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [sp, setSp] = useSearchParams();
  const [dias, setDias] = useState<number>(Number(sp.get('dias') ?? 90));

  const params = useMemo(() => empresaId ? { empresaId, dias } : null, [empresaId, dias]);
  const { data = [], isLoading } = useRelatorioParados(params);

  const handleExport = () => {
    if (data.length === 0) return;
    const csv = rowsToCsv(data as unknown as Record<string, unknown>[], [
      'codigo', 'nome', 'saldo_total', 'custo_medio', 'valor_imobilizado', 'ultima_saida', 'dias_parado',
    ]);
    downloadCsv(`produtos_parados_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Timer className="h-8 w-8" /> Produtos Parados
          </h1>
          <p className="text-muted-foreground">Produtos com saldo &gt; 0 sem saída há N dias.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Dias sem saída</Label>
            <Select value={String(dias)} onValueChange={(v) => { setDias(Number(v)); setSp({ dias: v }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
                <SelectItem value="180">180 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Custo Médio</TableHead>
                <TableHead className="text-right">Valor Imobilizado</TableHead>
                <TableHead>Última Saída</TableHead>
                <TableHead className="text-right">Dias Parado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum produto parado</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.produto_id}>
                  <TableCell className="font-mono">{r.codigo ?? '—'}</TableCell>
                  <TableCell>{r.nome}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.saldo_total).toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{money(Number(r.custo_medio))}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{money(Number(r.valor_imobilizado))}</TableCell>
                  <TableCell className="text-muted-foreground">{r.ultima_saida ? new Date(r.ultima_saida).toLocaleDateString('pt-BR') : 'Sem saídas'}</TableCell>
                  <TableCell className="text-right font-mono">{r.dias_parado}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ParadosPage;
