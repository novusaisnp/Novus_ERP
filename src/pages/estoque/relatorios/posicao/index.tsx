// P14.2: Relatório Posição por Localização
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, MapPin } from 'lucide-react';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useRelatorioPosicao } from '@/hooks/estoque/useRelatoriosEstoque';
import { downloadCsv, rowsToCsv } from '@/services/estoque/relatoriosService';

const money = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PosicaoPage: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const params = useMemo(() => empresaId ? { empresaId } : null, [empresaId]);
  const { data = [], isLoading } = useRelatorioPosicao(params);

  const handleExport = () => {
    if (data.length === 0) return;
    const csv = rowsToCsv(data as unknown as Record<string, unknown>[], [
      'produto_codigo', 'produto_nome', 'localizacao_nome', 'quantidade', 'custo_medio', 'valor_total',
    ]);
    downloadCsv(`posicao_estoque_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <MapPin className="h-8 w-8" /> Posição por Localização
          </h1>
          <p className="text-muted-foreground">Saldo por produto e localização.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
          <Download className="h-4 w-4 mr-2" /> CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Custo Médio</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem posição registrada</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={`${r.produto_id}-${r.localizacao_id}`}>
                  <TableCell className="font-mono">{r.produto_codigo ?? '—'}</TableCell>
                  <TableCell>{r.produto_nome}</TableCell>
                  <TableCell className="text-muted-foreground">{r.localizacao_nome}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.quantidade).toFixed(3)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{money(Number(r.custo_medio))}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{money(Number(r.valor_total))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PosicaoPage;
