
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useModalidadeCaixas } from '@/hooks/useConfigBasicas';
import { ModalidadeCaixaModal } from './ModalidadeCaixaModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { ModalidadeCaixa } from '@/types/configBasicas';

console.log('[ModalidadeCaixasTab] Componente inicializado');

export const ModalidadeCaixasTab = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ModalidadeCaixa | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [apenasAtivos, setApenasAtivos] = useState(false);
  
  const { 
    getQuery,
    searchQuery,
    create, 
    update, 
    delete: deleteModalidade,
    isCreating,
    isUpdating,
    isDeleting
  } = useModalidadeCaixas();

  // Usar busca se houver termo, senão listar todos
  const query = searchTerm ? searchQuery(searchTerm, apenasAtivos) : getQuery(apenasAtivos);
  const modalidades = query.data || [];
  const isLoading = query.isLoading;

  console.log('[ModalidadeCaixasTab] Renderizando com', modalidades.length, 'modalidades');

  const handleEdit = (modalidade: ModalidadeCaixa) => {
    console.log('[ModalidadeCaixasTab] Editando modalidade:', modalidade.id);
    setEditingItem(modalidade);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    console.log('[ModalidadeCaixasTab] Excluindo modalidade:', id);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Modalidade de Caixa</h3>
          <p className="text-sm text-muted-foreground">
            Configure as modalidades de caixa disponíveis
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Modalidade
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="search">Buscar por nome</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Digite o nome da modalidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="apenas-ativos"
                checked={apenasAtivos}
                onCheckedChange={setApenasAtivos}
              />
              <Label htmlFor="apenas-ativos" className="text-sm">Somente ativos</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {modalidades.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma modalidade encontrada' : 'Nenhuma modalidade de caixa cadastrada'}
            </p>
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
                    {modalidade.sigla}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Status:</span>
                    <Badge variant={modalidade.ativo ? 'default' : 'secondary'}>
                      {modalidade.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Indica Boleto:</span>
                    <Switch checked={modalidade.indica_boleto} disabled />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Indica Cartão:</span>
                    <Switch checked={modalidade.indica_cartao_credito} disabled />
                  </div>
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
                          Tem certeza que deseja excluir a modalidade de caixa "{modalidade.nome}"?
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

      <ModalidadeCaixaModal
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
