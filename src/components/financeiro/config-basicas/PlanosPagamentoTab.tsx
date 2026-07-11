
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { usePlanosPagamento } from '@/hooks/useConfigBasicas';
import { PlanoPagamentoModal } from './PlanoPagamentoModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { PlanoPagamento } from '@/types/configBasicas';

console.log('[PlanosPagamentoTab] Componente inicializado');

export const PlanosPagamentoTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanoPagamento | null>(null);
  
  const { 
    planos, 
    isLoading, 
    create, 
    update, 
    delete: deletePlano,
    isCreating,
    isUpdating,
    isDeleting
  } = usePlanosPagamento();

  console.log('[PlanosPagamentoTab] Renderizando com', planos.length, 'planos');

  const handleEdit = (plano: PlanoPagamento) => {
    console.log('[PlanosPagamentoTab] Editando plano:', plano.id);
    setEditingItem(plano);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('[PlanosPagamentoTab] Excluindo plano:', id);
    deletePlano(id);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Planos de Pagamento</h3>
          <p className="text-sm text-muted-foreground">
            Configure os planos de pagamento disponíveis
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Plano
        </Button>
      </div>

      {planos.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum plano de pagamento cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planos.map((plano) => (
            <Card key={plano.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plano.nome}</CardTitle>
                  <Badge variant={plano.ativo ? 'default' : 'secondary'}>
                    {plano.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(plano)}
                    disabled={isUpdating}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDeleting}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o plano de pagamento "{plano.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(plano.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
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
