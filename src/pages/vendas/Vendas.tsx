import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShoppingCart, Plus, Pencil, Trash2, Ban } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';

import { useVendas } from '@/hooks/useVendas';
import { VendaFormModal } from '@/components/vendas/VendaFormModal';
import { GerarTitulosButton } from '@/components/vendas/GerarTitulosButton';
import { Venda, VendaStatus, VendaFiltros } from '@/types/vendas';

const STATUS: VendaStatus[] = ['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];

const Vendas: React.FC = () => {
  const [filtros, setFiltros] = useState<VendaFiltros>({});
  const { vendas, loading, excluirVenda, cancelarVenda } = useVendas(filtros);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Venda | null>(null);
  const [toDelete, setToDelete] = useState<Venda | null>(null);
  const [toCancel, setToCancel] = useState<Venda | null>(null);

  const abrirNovo = () => { setEditing(null); setModalOpen(true); };
  const abrirEdit = (v: Venda) => { setEditing(v); setModalOpen(true); };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Vendas</h1>
          <p className="text-muted-foreground">Gerencie os pedidos de venda</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4 mr-2" />Nova Venda</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Status</Label>
            <Select
              value={filtros.status || '__ALL__'}
              onValueChange={(v) => setFiltros((p) => ({ ...p, status: v === '__ALL__' ? '' : (v as VendaStatus) }))}
            >
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data Início</Label>
            <Input type="date" value={filtros.data_inicio || ''} onChange={(e) => setFiltros((p) => ({ ...p, data_inicio: e.target.value }))} />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input type="date" value={filtros.data_fim || ''} onChange={(e) => setFiltros((p) => ({ ...p, data_fim: e.target.value }))} />
          </div>
          <div>
            <Label>Buscar Nº</Label>
            <Input value={filtros.busca || ''} onChange={(e) => setFiltros((p) => ({ ...p, busca: e.target.value }))} placeholder="Nº da venda" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : vendas.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.numero_venda || '-'}</TableCell>
                    <TableCell>{v.data_venda}</TableCell>
                    <TableCell>{v.cliente?.nome || '-'}</TableCell>
                    <TableCell><Badge variant="outline">{v.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {(v.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => abrirEdit(v)}><Pencil className="h-4 w-4" /></Button>
                      <GerarTitulosButton venda={v} />
                      {v.status !== 'CANCELADO' && (
                        <Button size="icon" variant="ghost" onClick={() => setToCancel(v)} title="Cancelar">
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(v)} title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <VendaFormModal open={modalOpen} onOpenChange={setModalOpen} venda={editing} />

      <ConfirmDeleteWithDeps
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        entidade="vendas"
        id={toDelete?.id ?? null}
        nomeRegistro={toDelete?.numero_venda ? `venda ${toDelete.numero_venda}` : undefined}
        onConfirm={async () => { if (toDelete?.id) await excluirVenda(toDelete.id); setToDelete(null); }}
      />

      <ConfirmDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
        title="Cancelar venda?"
        description="A venda será marcada como CANCELADA."
        onConfirm={async () => { if (toCancel?.id) await cancelarVenda(toCancel.id); setToCancel(null); }}
      />
    </div>
  );
};

export default Vendas;
