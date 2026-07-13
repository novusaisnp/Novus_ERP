
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
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
import { FormCategoria } from '@/components/modules/FormCategoria';
import {
  useCategorias,
  useCreateCategoria,
  useUpdateCategoria,
  useDeleteCategoria,
} from '@/hooks/useCategorias';
import type { Categoria } from '@/services/categoriaService';

const Categorias: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);

  const { data: categorias = [], isLoading } = useCategorias();
  const createMutation = useCreateCategoria();
  const updateMutation = useUpdateCategoria();
  const deleteMutation = useDeleteCategoria();

  const filteredCategorias = categorias.filter((categoria) =>
    categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    categoria.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    console.log('[Categorias] Abrindo formulário para nova categoria');
    setSelectedCategoria(null);
    setIsFormOpen(true);
  };

  const handleEdit = (categoria: Categoria) => {
    console.log('[Categorias] Editando categoria:', categoria.id);
    setSelectedCategoria(categoria);
    setIsFormOpen(true);
  };

  const handleDelete = (categoria: Categoria) => {
    console.log('[Categorias] Solicitando exclusão da categoria:', categoria.id);
    setCategoriaToDelete(categoria);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoriaToDelete) {
      console.log('[Categorias] Confirmando exclusão da categoria:', categoriaToDelete.id);
      deleteMutation.mutate(categoriaToDelete.id);
      setDeleteDialogOpen(false);
      setCategoriaToDelete(null);
    }
  };

  const handleFormSubmit = (data: any) => {
    if (selectedCategoria) {
      console.log('[Categorias] Atualizando categoria:', selectedCategoria.id);
      updateMutation.mutate({
        id: selectedCategoria.id,
        categoria: data,
      });
    } else {
      console.log('[Categorias] Criando nova categoria');
      createMutation.mutate(data);
    }
    setIsFormOpen(false);
    setSelectedCategoria(null);
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
          <h1 className="text-3xl font-bold">Categorias de Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias para organização fiscal e tributária
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorias Cadastradas</CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorias..."
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
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategorias.map((categoria) => {
                  const c = categoria as any;
                  const temReceita = !!c.plano_conta_receita_id;
                  const temDespesa = !!c.plano_conta_despesa_id;
                  const completa = temReceita && temDespesa;
                  return (
                    <TableRow key={categoria.id}>
                      <TableCell className="font-medium">{categoria.nome}</TableCell>
                      <TableCell>{categoria.descricao || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? 'default' : 'secondary'}>
                          {c.ativo ? 'Ativa' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={completa ? 'default' : 'outline'} className={completa ? '' : 'text-amber-600 border-amber-500'}>
                          {completa ? 'Completa' : temReceita || temDespesa ? 'Parcial' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(categoria)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(categoria)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

        </CardContent>
      </Card>

      <FormCategoria
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCategoria(null);
        }}
        categoria={selectedCategoria}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{categoriaToDelete?.nome}"?
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

export default Categorias;
