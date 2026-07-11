import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { usePlanosPagamento } from '@/hooks/useConfigBasicas';
import { usePagamentoNaturezas, usePagamentoModalidades } from '@/hooks/usePagamentoCatalogo';
import { PlanoPagamentoModal } from './PlanoPagamentoModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { PlanoPagamento } from '@/types/configBasicas';

console.log('[PlanosPagamentoTab] Componente inicializado');

export const PlanosPagamentoTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanoPagamento | null>(null);
  const [filtroNatureza, setFiltroNatureza] = useState<string>('all');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('all');

  const {
    planos,
    isLoading,
    create,
    update,
    delete: deletePlano,
    isCreating,
    isUpdating,
    isDeleting,
  } = usePlanosPagamento();

  const { data: naturezas = [] } = usePagamentoNaturezas(false);
  const { data: modalidades = [] } = usePagamentoModalidades(false);

  const naturezaMap = useMemo(() => Object.fromEntries(naturezas.map((n) => [n.id, n])), [naturezas]);
  const modalidadeMap = useMemo(() => Object.fromEntries(modalidades.map((m) => [m.id, m])), [modalidades]);

  const planosFiltrados = planos.filter((p) => {
    if (filtroNatureza !== 'all' && p.natureza_id !== filtroNatureza) return false;
    if (filtroModalidade !== 'all' && p.modalidade_default_id !== filtroModalidade) return false;
    return true;
  });

  const handleEdit = (plano: PlanoPagamento) => {
    setEditingItem(plano);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => deletePlano(id);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Planos de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Configure os planos disponíveis. Cada plano herda o comportamento da Natureza e sugere uma Modalidade default.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Plano
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <Select value={filtroNatureza} onValueChange={setFiltroNatureza}>
            <SelectTrigger><SelectValue placeholder="Filtrar por natureza" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as naturezas</SelectItem>
              {naturezas.map((n) => (<SelectItem key={n.id} value={n.id}>{n.nome}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
            <SelectTrigger><SelectValue placeholder="Filtrar por modalidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as modalidades</SelectItem>
              {modalidades.map((m) => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {planosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum plano de pagamento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planosFiltrados.map((plano) => {
            const nat = plano.natureza_id ? naturezaMap[plano.natureza_id] : null;
            const mod = plano.modalidade_default_id ? modalidadeMap[plano.modalidade_default_id] : null;
            return (
              <Card key={plano.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{plano.nome}</CardTitle>
                    <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1 text-xs">
                    {nat ? (
                      <Badge variant="outline">Natureza: {nat.nome}</Badge>
                    ) : (
                      <Badge variant="destructive">Sem natureza</Badge>
                    )}
                    {mod && <Badge variant="outline">Modalidade: {mod.nome}</Badge>}
                    {plano.qtd_parcelas ? <Badge variant="outline">{plano.qtd_parcelas}x</Badge> : null}
                    {plano.juros_am ? <Badge variant="outline">{plano.juros_am}% a.m.</Badge> : null}
                    {plano.percentual_entrada ? <Badge variant="outline">Entrada {plano.percentual_entrada}%</Badge> : null}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(plano)} disabled={isUpdating}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isDeleting}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o plano de pagamento "{plano.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(plano.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PlanoPagamentoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        plano={editingItem}
        onSubmit={(data) => {
          if (editingItem) {
            update({ id: editingItem.id, data });
          } else {
            create(data);
          }
          handleCloseModal();
        }}
        isLoading={isCreating || isUpdating}
      />
    </div>
  );
};
