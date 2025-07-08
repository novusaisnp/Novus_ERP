
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useNaturezaCaixas } from '@/hooks/useConfigBasicas';
import { NaturezaCaixaModal } from './NaturezaCaixaModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { NaturezaCaixa } from '@/types/configBasicas';

console.log('[NaturezaCaixasTab] Componente inicializado');

export const NaturezaCaixasTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NaturezaCaixa | null>(null);
  
  const { 
    naturezas, 
    isLoading, 
    create, 
    update, 
    delete: deleteNatureza,
    isCreating,
    isUpdating,
    isDeleting
  } = useNaturezaCaixas();

  console.log('[NaturezaCaixasTab] Renderizando com', naturezas.length, 'naturezas');

  const handleEdit = (natureza: NaturezaCaixa) => {
    console.log('[NaturezaCaixasTab] Editando natureza:', natureza.id);
    setEditingItem(natureza);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('[NaturezaCaixasTab] Excluindo natureza:', id);
    deleteNatureza(id);
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
          <h3 className="text-lg font-semibold">Natureza de Caixas</h3>
          <p className="text-sm text-muted-foreground">
            Configure os parâmetros operacionais por forma de pagamento
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Caixa
        </Button>
      </div>

      {naturezas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma natureza de caixa cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {naturezas.map((natureza) => (
            <Card key={natureza.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{natureza.nome}</CardTitle>
                  <Badge variant={natureza.ativo ? 'default' : 'secondary'}>
                    {natureza.sigla}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span>Baixa:</span>
                    <Switch checked={natureza.baixa} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Gera Troco:</span>
                    <Switch checked={natureza.gera_troco} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valor Pago:</span>
                    <Switch checked={natureza.informa_valor_pago} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Baixa Pend.:</span>
                    <Switch checked={natureza.baixa_pendente} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Online:</span>
                    <Switch checked={natureza.pagamento_online} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Convênio:</span>
                    <Switch checked={natureza.conta_convenio} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mostra Troco:</span>
                    <Switch checked={natureza.mostra_troco} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Força NF:</span>
                    <Switch checked={natureza.forma_nota_fiscal} disabled />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(natureza)}
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
                          Tem certeza que deseja excluir a natureza de caixa "{natureza.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(natureza.id)}>
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

      <NaturezaCaixaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        natureza={editingItem}
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
