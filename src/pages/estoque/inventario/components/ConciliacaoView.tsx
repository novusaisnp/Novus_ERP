// P12: Tela de contagem e conciliação de um inventário
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useInventarioItens, useConciliarInventario } from '@/hooks/estoque/useEstoque';
import { estoqueService } from '@/services/estoque/estoqueService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  inventarioId: string;
  onVoltar: () => void;
}

export const ConciliacaoView: React.FC<Props> = ({ inventarioId, onVoltar }) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: itens = [], isLoading } = useInventarioItens(inventarioId);
  const conciliar = useConciliarInventario();

  const { data: inv } = useQuery({
    queryKey: ['inventario', inventarioId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('estoque_inventarios')
        .select('*')
        .eq('id', inventarioId)
        .single();
      return data;
    },
  });

  const { data: produtosMap = {} } = useQuery({
    queryKey: ['produtos-map-inv', inventarioId, itens.length],
    enabled: itens.length > 0,
    queryFn: async () => {
      const ids = itens.map((i) => i.produto_id);
      const { data } = await (supabase as any)
        .from('produtos')
        .select('id, nome, codigo')
        .in('id', ids);
      const map: Record<string, { nome: string; codigo: string | null }> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = { nome: p.nome, codigo: p.codigo }; });
      return map;
    },
  });

  const totais = useMemo(() => {
    const divergentes = itens.filter((i) => Number(i.diferenca) !== 0).length;
    return { total: itens.length, divergentes };
  }, [itens]);

  const readOnly = inv?.status === 'CONCILIADO' || inv?.status === 'CANCELADO';

  const handleContagemChange = async (itemId: string, valor: string) => {
    const n = Number(valor);
    if (Number.isNaN(n)) return;
    try {
      await estoqueService.atualizarContagem(itemId, n);
      qc.invalidateQueries({ queryKey: ['estoque', 'inventario-itens', inventarioId] });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar contagem', description: e?.message, variant: 'destructive' });
    }
  };

  const handleConciliar = async () => {
    try {
      const r = await conciliar.mutateAsync(inventarioId);
      toast({
        title: 'Inventário conciliado',
        description: `${r.gerados} ajuste(s) gerado(s)`,
      });
      qc.invalidateQueries({ queryKey: ['estoque'] });
      onVoltar();
    } catch (e: any) {
      toast({ title: 'Erro ao conciliar', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onVoltar}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">Inventário {inv?.codigo ?? ''}</h1>
            <p className="text-sm text-muted-foreground">
              Status: <Badge variant="outline">{inv?.status}</Badge> · {totais.total} itens · {totais.divergentes} divergência(s)
            </p>
          </div>
        </div>
        {!readOnly && (
          <Button onClick={handleConciliar} disabled={conciliar.isPending}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {conciliar.isPending ? 'Conciliando...' : 'Conciliar Inventário'}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens Contados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Saldo Sistema</TableHead>
                <TableHead className="text-right">Contado</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && itens.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum item</TableCell></TableRow>
              )}
              {itens.map((i) => {
                const dif = Number(i.diferenca);
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      {produtosMap[i.produto_id]?.nome ?? i.produto_id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{Number(i.saldo_sistema).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.001"
                        className="w-28 ml-auto text-right font-mono"
                        defaultValue={Number(i.saldo_contado).toFixed(3)}
                        disabled={readOnly}
                        onBlur={(e) => {
                          if (Number(e.target.value) !== Number(i.saldo_contado)) {
                            handleContagemChange(i.id, e.target.value);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className={`text-right font-mono ${dif === 0 ? '' : dif > 0 ? 'text-primary' : 'text-destructive'}`}>
                      {dif > 0 ? '+' : ''}{dif.toFixed(3)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
