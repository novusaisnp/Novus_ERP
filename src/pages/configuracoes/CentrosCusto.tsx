
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search } from 'lucide-react';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import { CentroCustoModal } from '@/components/configuracoes/CentroCustoModal';
import { CentroCustoCard } from '@/components/configuracoes/CentroCustoCard';
import { CentroCustoEmptyState } from '@/components/configuracoes/CentroCustoEmptyState';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { Skeleton } from '@/components/ui/skeleton';
import type { CentroCusto } from '@/types/configuracoes';

const CentrosCusto: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCentroCusto, setEditingCentroCusto] = useState<CentroCusto | undefined>();
  const [confirmingDelete, setConfirmingDelete] = useState<CentroCusto | null>(null);
  
  const {
    centrosCusto,
    isLoading,
    criar,
    atualizar,
    excluir,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCentrosCusto();

  const filteredCentrosCusto = centrosCusto.filter(centro =>
    centro.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (centro.codigo && centro.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (centro.descricao && centro.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddNew = () => {
    setEditingCentroCusto(undefined);
    setModalOpen(true);
  };

  const handleEdit = (centroCusto: CentroCusto) => {
    setEditingCentroCusto(centroCusto);
    setModalOpen(true);
  };

  const handleDelete = async (centroCusto: CentroCusto) => {
    setConfirmingDelete(centroCusto);
  };

  const handleSave = async (data: any) => {
    if (editingCentroCusto) {
      return await atualizar({ id: editingCentroCusto.id, data });
    } else {
      return await criar(data);
    }
  };

  const isLoaderActive = isLoading || isCreating || isUpdating || isDeleting;

  if (isLoading && centrosCusto.length === 0) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Centros de Custo
        </h1>
        <p className="text-muted-foreground">
          Gerencie os centros de custo da sua empresa
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar centros de custo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Centro de Custo
        </Button>
      </div>

      {/* Content */}
      {filteredCentrosCusto.length === 0 && !isLoading ? (
        searchTerm ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nenhum resultado encontrado
              </h3>
              <p className="text-gray-600">
                Não foram encontrados centros de custo com o termo "{searchTerm}"
              </p>
            </CardContent>
          </Card>
        ) : (
          <CentroCustoEmptyState onAddNew={handleAddNew} />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCentrosCusto.map((centroCusto) => (
            <CentroCustoCard
              key={centroCusto.id}
              centroCusto={centroCusto}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={isLoaderActive}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <CentroCustoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        centroCusto={editingCentroCusto}
        onSave={handleSave}
        loading={isLoaderActive}
      />

      <ConfirmDialog
        open={!!confirmingDelete}
        onOpenChange={(open) => !open && setConfirmingDelete(null)}
        title="Remover centro de custo"
        description={confirmingDelete ? `Tem certeza que deseja remover o centro de custo "${confirmingDelete.nome}"?` : ''}
        confirmLabel="Remover"
        onConfirm={() => {
          if (confirmingDelete) excluir(confirmingDelete.id);
          setConfirmingDelete(null);
        }}
      />
    </div>
  );
};

export default CentrosCusto;
