
import React, { useState } from 'react';
import { useCargos } from '@/hooks/useCargos';
import { Cargo } from '@/types/rh';
import FormCargo from '@/components/modules/FormCargo';
import { CargosHeader } from '@/components/modules/Cargos/CargosHeader';
import { CargosStats } from '@/components/modules/Cargos/CargosStats';
import { CargosSearch } from '@/components/modules/Cargos/CargosSearch';
import { CargosEmptyState } from '@/components/modules/Cargos/CargosEmptyState';
import { CargoCard } from '@/components/modules/Cargos/CargoCard';

const Cargos: React.FC = () => {
  const { cargos, loading, deleteCargo } = useCargos();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [cargoSelecionado, setCargoSelecionado] = useState<Cargo | null>(null);

  console.log('[Cargos] Renderizando página de Cargos');
  console.log('[Cargos] Total de cargos carregados:', cargos.length);
  console.log('[Cargos] Cargos:', cargos);

  const filteredCargos = cargos.filter(cargo =>
    cargo.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('[Cargos] Cargos filtrados:', filteredCargos.length);

  const handleNovoCargo = () => {
    console.log('[Cargos] Abrindo modal para novo cargo');
    setCargoSelecionado(null);
    setModalOpen(true);
  };

  const handleEditarCargo = (cargo: Cargo) => {
    console.log('[Cargos] Abrindo modal para editar cargo:', cargo.nome, 'ID:', cargo.id);
    setCargoSelecionado(cargo);
    setModalOpen(true);
  };

  const handleExcluirCargo = async (cargo: Cargo) => {
    console.log('[Cargos] Confirmando exclusão do cargo:', cargo.nome);
    
    if (window.confirm(`Tem certeza que deseja excluir o cargo "${cargo.nome}"?`)) {
      console.log('[Cargos] Usuario confirmou exclusão');
      await deleteCargo(cargo.id!);
    } else {
      console.log('[Cargos] Usuario cancelou exclusão');
    }
  };

  const handleModalSuccess = () => {
    console.log('[Cargos] Modal success callback executado');
    setModalOpen(false);
    setCargoSelecionado(null);
  };

  const handleModalClose = (open: boolean) => {
    console.log('[Cargos] Modal change callback:', open);
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
    </div>
  );
};

export default Cargos;
