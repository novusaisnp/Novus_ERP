
import React, { useState } from 'react';
import { useCargos } from '@/hooks/useCargos';
import { Cargo } from '@/types/rh';
import FormCargo from '@/components/modules/FormCargo';
import { CargosHeader } from '@/components/modules/Cargos/CargosHeader';
import { CargosStats } from '@/components/modules/Cargos/CargosStats';
import { CargosSearch } from '@/components/modules/Cargos/CargosSearch';
import { CargosEmptyState } from '@/components/modules/Cargos/CargosEmptyState';
import { CargoCard } from '@/components/modules/Cargos/CargoCard';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const Cargos: React.FC = () => {
  const { cargos, loading, deleteCargo } = useCargos();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [cargoSelecionado, setCargoSelecionado] = useState<Cargo | null>(null);
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null);

  const filteredCargos = cargos.filter(cargo =>
    cargo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNovoCargo = () => {
    setCargoSelecionado(null);
    setModalOpen(true);
  };

  const handleEditarCargo = (cargo: Cargo) => {
    setCargoSelecionado(cargo);
    setModalOpen(true);
  };

  const handleExcluirCargo = (cargo: Cargo) => {
    setCargoToDelete(cargo);
  };

  const confirmDelete = async () => {
    if (cargoToDelete?.id) {
      await deleteCargo(cargoToDelete.id);
      setCargoToDelete(null);
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setCargoSelecionado(null);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setCargoSelecionado(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <CargosHeader onNovoCargo={handleNovoCargo} />
      
      <CargosStats totalCargos={cargos.length} />
      
      <CargosSearch 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />

      <div className="grid gap-4">
        {filteredCargos.length === 0 ? (
          <CargosEmptyState 
            searchTerm={searchTerm} 
            onNovoCargo={handleNovoCargo} 
          />
        ) : (
          filteredCargos.map((cargo) => (
            <CargoCard
              key={cargo.id}
              cargo={cargo}
              onEdit={handleEditarCargo}
              onDelete={handleExcluirCargo}
            />
          ))
        )}
      </div>

      <FormCargo
        open={modalOpen}
        onOpenChange={handleModalClose}
        cargo={cargoSelecionado}
        onSuccess={handleModalSuccess}
      />

      <ConfirmDialog
        open={!!cargoToDelete}
        onOpenChange={(open) => !open && setCargoToDelete(null)}
        title="Excluir cargo"
        description={`Tem certeza que deseja excluir o cargo "${cargoToDelete?.nome}"?`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Cargos;
