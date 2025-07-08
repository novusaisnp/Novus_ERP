
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useModalidadeAPIVinculo } from '@/hooks/useConfigBasicas';
import { ModalidadeAPIModal } from './ModalidadeAPIModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { ModalidadeAPIVinculo } from '@/types/configBasicas';

console.log('[ModalidadeAPITab] Componente inicializado');

export const ModalidadeAPITab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModalidadeAPIVinculo | null>(null);
  
  const { 
    modalidades, 
    isLoading, 
    create, 
    update, 
    delete: deleteModalidade,
    isCreating,
    isUpdating,
    isDeleting
  } = useModalidadeAPIVinculo();

  console.log('[ModalidadeAPITab] Renderizando com', modalidades.length, 'modalidades API');

  const handleEdit = (modalidade: ModalidadeAPIVinculo) => {
    console.log('[ModalidadeAPITab] Editando modalidade API:', modalidade.id);
    setEditingItem(modalidade);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('[ModalidadeAPITab] Excluindo modalidade API:', id);
    deleteModalidade(id);
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
          <h3 className="text-lg font-semibold">Modalidade API Vínculo</h3>
          <p className="text-sm text-muted-foreground">
            Configure as modalidades para integração com APIs externas
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Modalidade API
        </Button>
      </div>

      {modalidades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma modalidade API cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modalidades.map((modalidade) => (
            <Card key={modalidade.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{modalidade.nome}</CardTitle>
                  <Badge variant={modalidade.ativo ? 'default' : 'secondary'}>
                    {modalidade.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  {modalidade.codigo_externo && (
                    <div>
                      <span className="font-medium">Código Externo:</span>
                      <p className="text-muted-foreground">{modalidade.codigo_externo}</p>
                    </div>
                  )}
                  {modalidade.descricao && (
                    <div>
                      <span className="font-medium">Descrição:</span>
                      <p className="text-muted-foreground text-xs">{modalidade.descricao}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(modalidade)}
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
                          Tem certeza que deseja excluir a modalidade API "{modalidade.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(modalidade.id)}>
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

      <ModalidadeAPIModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        modalidade={editingItem}
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
