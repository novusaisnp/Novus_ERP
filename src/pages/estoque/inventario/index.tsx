// P12: Página de Inventário de Estoque
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ClipboardList, Plus, Eye } from 'lucide-react';
import { estoqueService } from '@/services/estoque/estoqueService';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useInventarios } from '@/hooks/estoque/useEstoque';
import { NovoInventarioDialog } from './components/NovoInventarioDialog';
import { ConciliacaoView } from './components/ConciliacaoView';
import type { EstoqueInventarioStatus } from '@/types/estoque';

const statusColor: Record<EstoqueInventarioStatus, string> = {
  RASCUNHO: 'bg-muted text-muted-foreground',
  EM_CONTAGEM: 'bg-primary/10 text-primary',
  CONCILIADO: 'bg-primary/20 text-primary',
  CANCELADO: 'bg-destructive/10 text-destructive',
};

const Inventario: React.FC = () => {
  const { data: empresaId } = useEmpresaAtual();
  const { data: inventarios = [], isLoading } = useInventarios(empresaId ?? undefined);
  const [novoOpen, setNovoOpen] = useState(false);
  const [invSelecionado, setInvSelecionado] = useState<string | null>(null);

  const { data: locsMap = {} } = useQuery({
    queryKey: ['locs-map', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const locs = await estoqueService.listLocalizacoes(empresaId as string);
      const map: Record<string, string> = {};
      locs.forEach((l) => { map[l.id] = l.nome; });
      return map;
    },
  });

  if (invSelecionado) {
    return (
      <ConciliacaoView
        inventarioId={invSelecionado}
        onVoltar={() => setInvSelecionado(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Inventário
          </h1>
          <p className="text-muted-foreground">Contagem física e conciliação de estoque</p>
        </div>
        <Button onClick={() => setNovoOpen(true)} disabled={!empresaId}>
          <Plus className="h-4 w-4 mr-2" /> Novo Inventário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && inventarios.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum inventário registrado</TableCell></TableRow>
              )}
              {inventarios.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.codigo}</TableCell>
                  <TableCell>{inv.localizacao_id ? locsMap[inv.localizacao_id] ?? '—' : '—'}</TableCell>
                  <TableCell>{new Date(inv.data_inicio).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{inv.data_fim ? new Date(inv.data_fim).toLocaleDateString('pt-BR') : '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[inv.status]} variant="outline">{inv.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setInvSelecionado(inv.id)}>
                      <Eye className="h-3 w-3 mr-1" /> Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {novoOpen && empresaId && (
        <NovoInventarioDialog
          empresaId={empresaId}
          open={novoOpen}
          onClose={() => setNovoOpen(false)}
        />
      )}
    </div>
  );
};

export default Inventario;
