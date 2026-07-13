
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Expand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { FormTamanho } from '@/components/modules/FormTamanho';
import {
  useTamanhos,
  useCreateTamanho,
  useUpdateTamanho,
  useDeleteTamanho,
} from '@/hooks/useTamanhos';
import type { Tamanho } from '@/services/tamanhoService';

const Tamanhos: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTamanho, setSelectedTamanho] = useState<Tamanho | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tamanhoToDelete, setTamanhoToDelete] = useState<Tamanho | null>(null);

  const { data: tamanhos = [], isLoading } = useTamanhos();
  const createMutation = useCreateTamanho();
  const updateMutation = useUpdateTamanho();
  const deleteMutation = useDeleteTamanho();

  const filteredTamanhos = tamanhos.filter((tamanho) =>
    tamanho.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    console.log('[Tamanhos] Abrindo formulário para novo tamanho');
    setSelectedTamanho(null);
    setIsFormOpen(true);
  };

  const handleEdit = (tamanho: Tamanho) => {
    console.log('[Tamanhos] Editando tamanho:', tamanho.id);
    setSelectedTamanho(tamanho);
    setIsFormOpen(true);
  };

  const handleDelete = (tamanho: Tamanho) => {
    console.log('[Tamanhos] Solicitando exclusão do tamanho:', tamanho.id);
    setTamanhoToDelete(tamanho);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (tamanhoToDelete) {
      console.log('[Tamanhos] Confirmando exclusão do tamanho:', tamanhoToDelete.id);
      deleteMutation.mutate(tamanhoToDelete.id);
      setDeleteDialogOpen(false);
      setTamanhoToDelete(null);
    }
  };

  const handleFormSubmit = (data: any) => {
    if (selectedTamanho) {
      console.log('[Tamanhos] Atualizando tamanho:', selectedTamanho.id);
      updateMutation.mutate({
        id: selectedTamanho.id,
        tamanho: data,
      });
    } else {
      console.log('[Tamanhos] Criando novo tamanho');
      createMutation.mutate(data);
    }
    setIsFormOpen(false);
    setSelectedTamanho(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tamanhos de Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os tamanhos disponíveis para os produtos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tamanho
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Expand className="h-5 w-5" />
            Tamanhos Cadastrados
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tamanhos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTamanhos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhum tamanho encontrado.' : 'Nenhum tamanho cadastrado.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTamanhos.map((tamanho) => (
                  <TableRow key={tamanho.id}>
                    <TableCell className="font-medium">{tamanho.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-green-600">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(tamanho)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tamanho)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormTamanho
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTamanho(null);
        }}
        tamanho={selectedTamanho}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o tamanho "{tamanhoToDelete?.descricao}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tamanhos;
