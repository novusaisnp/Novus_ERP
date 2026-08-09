
import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Scale } from 'lucide-react';
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
import { FormUnidadeMedida } from '@/components/modules/FormUnidadeMedida';
import {
  useUnidadesMedida,
  useCreateUnidadeMedida,
  useUpdateUnidadeMedida,
  useDeleteUnidadeMedida,
} from '@/hooks/useUnidadesMedida';
import type { UnidadeMedida } from '@/services/unidadeMedidaService';

const UnidadesMedida: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUnidadeMedida, setSelectedUnidadeMedida] = useState<UnidadeMedida | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadeMedidaToDelete, setUnidadeMedidaToDelete] = useState<UnidadeMedida | null>(null);

  const { data: unidadesMedida = [], isLoading } = useUnidadesMedida();
  const createMutation = useCreateUnidadeMedida();
  const updateMutation = useUpdateUnidadeMedida();
  const deleteMutation = useDeleteUnidadeMedida();

  const filteredUnidadesMedida = unidadesMedida.filter((unidade) =>
    unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.sigla.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    console.log('[UnidadesMedida] Abrindo formulário para nova unidade de medida');
    setSelectedUnidadeMedida(null);
    setIsFormOpen(true);
  };

  const handleEdit = (unidadeMedida: UnidadeMedida) => {
    console.log('[UnidadesMedida] Editando unidade de medida:', unidadeMedida.id);
    setSelectedUnidadeMedida(unidadeMedida);
    setIsFormOpen(true);
  };

  const handleDelete = (unidadeMedida: UnidadeMedida) => {
    console.log('[UnidadesMedida] Solicitando exclusão da unidade de medida:', unidadeMedida.id);
    setUnidadeMedidaToDelete(unidadeMedida);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (unidadeMedidaToDelete) {
      console.log('[UnidadesMedida] Confirmando exclusão da unidade de medida:', unidadeMedidaToDelete.id);
      deleteMutation.mutate(unidadeMedidaToDelete.id);
      setDeleteDialogOpen(false);
      setUnidadeMedidaToDelete(null);
    }
  };

  const handleFormSubmit = (data: any) => {
    if (selectedUnidadeMedida) {
      console.log('[UnidadesMedida] Atualizando unidade de medida:', selectedUnidadeMedida.id);
      updateMutation.mutate({
        id: selectedUnidadeMedida.id,
        unidadeMedida: data,
      });
    } else {
      console.log('[UnidadesMedida] Criando nova unidade de medida');
      createMutation.mutate(data);
    }
    setIsFormOpen(false);
    setSelectedUnidadeMedida(null);
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
          <h1 className="text-3xl font-bold">Unidades de Medida</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades de medida para produtos e fichas técnicas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Unidades Cadastradas
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidades..."
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
                <TableHead>Sigla</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnidadesMedida.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Nenhuma unidade encontrada.' : 'Nenhuma unidade cadastrada.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUnidadesMedida.map((unidade) => (
                  <TableRow key={unidade.id}>
                    <TableCell className="font-medium">{unidade.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{unidade.sigla}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-status-delivered">
                        Ativa
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(unidade)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(unidade)}
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

      <FormUnidadeMedida
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedUnidadeMedida(null);
        }}
        unidadeMedida={selectedUnidadeMedida}
        onSubmit={handleFormSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDeleteWithDeps
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        entidade="unidades_medida"
        id={unidadeMedidaToDelete?.id ?? null}
        nomeRegistro={unidadeMedidaToDelete ? `${unidadeMedidaToDelete.nome} (${unidadeMedidaToDelete.sigla})` : undefined}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};

export default UnidadesMedida;
