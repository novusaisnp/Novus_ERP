// P12: Página de Movimentações de Estoque
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowLeftRight, Plus, Search, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMovimentacoes } from '@/hooks/estoque/useEstoque';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { NovaMovimentacaoDialog } from './components/NovaMovimentacaoDialog';
import type { EstoqueMovimentacaoTipo } from '@/types/estoque';

const tipoLabel: Record<EstoqueMovimentacaoTipo, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  TRANSFERENCIA: 'Transferência',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (-)',
  INVENTARIO: 'Inventário',
};

const tipoBadge: Record<EstoqueMovimentacaoTipo, string> = {
  ENTRADA: 'bg-primary/10 text-primary',
  SAIDA: 'bg-destructive/10 text-destructive',
  TRANSFERENCIA: 'bg-accent/20 text-accent-foreground',
  AJUSTE_POSITIVO: 'bg-primary/10 text-primary',
  AJUSTE_NEGATIVO: 'bg-destructive/10 text-destructive',
  INVENTARIO: 'bg-secondary text-secondary-foreground',
};

const MovimentacoesEstoque: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const { data: movs = [], isLoading } = useMovimentacoes(
    empresaId ? { empresa_id: empresaId } : undefined,
  );

  const { data: produtosMap = {} } = useQuery({
    queryKey: ['produtos-map', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('produtos')
        .select('id, nome, codigo')
        .eq('empresa_representada_id', empresaId)
        .is('deleted_at', null);
      const map: Record<string, { nome: string; codigo: string | null }> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = { nome: p.nome, codigo: p.codigo }; });
      return map;
    },
  });

  const { data: locsMap = {} } = useQuery({
    queryKey: ['locs-map', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('localizacoes_estoque')
        .select('id, nome')
        .eq('empresa_representada_id', empresaId);
      const map: Record<string, string> = {};
      (data ?? []).forEach((l: any) => { map[l.id] = l.nome; });
      return map;
    },
  });

  const filtered = useMemo(() => {
    if (!busca.trim()) return movs;
    const q = busca.toLowerCase();
    return movs.filter((m) => {
      const p = produtosMap[m.produto_id];
      return (
        p?.nome.toLowerCase().includes(q) ||
        p?.codigo?.toLowerCase().includes(q) ||
        m.documento_ref?.toLowerCase().includes(q) ||
        tipoLabel[m.tipo].toLowerCase().includes(q)
      );
    });
  }, [movs, busca, produtosMap]);

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ArrowLeftRight className="h-8 w-8" />
            Movimentações de Estoque
          </h1>
          <p className="text-muted-foreground">Entradas, saídas, transferências e ajustes</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} disabled={!empresaId} data-testid="estoque-nova-mov-btn">
          <Plus className="h-4 w-4 mr-2" /> Nova Movimentação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por produto, código, documento ou tipo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((m) => (
                <TableRow key={m.id} data-testid={`estoque-mov-row-${m.id}`}>
                  <TableCell>{new Date(m.data_movimento).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    <Badge className={tipoBadge[m.tipo]} variant="outline">
                      {tipoLabel[m.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell>{produtosMap[m.produto_id]?.nome ?? m.produto_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-mono">{Number(m.quantidade).toFixed(3)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.localizacao_origem_id ? locsMap[m.localizacao_origem_id] ?? '—' : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.localizacao_destino_id ? locsMap[m.localizacao_destino_id] ?? '—' : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.documento_ref ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" title="Ver Kardex">
                      <Link to={`/estoque/kardex/${m.produto_id}`}>
                        <ScrollText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {isDialogOpen && empresaId && (
        <NovaMovimentacaoDialog
          empresaId={empresaId}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default MovimentacoesEstoque;
