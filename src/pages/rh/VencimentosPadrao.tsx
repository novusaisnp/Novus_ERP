
import React, { useState } from 'react';
import { useVencimentosPadrao } from '@/hooks/useVencimentosPadrao';
import { VencimentoPadrao } from '@/types/rh';
import { VencimentosPadraoHeader } from '@/components/modules/VencimentosPadrao/VencimentosPadraoHeader';
import { VencimentosPadraoStats } from '@/components/modules/VencimentosPadrao/VencimentosPadraoStats';
import { VencimentosPadraoFilters } from '@/components/modules/VencimentosPadrao/VencimentosPadraoFilters';
import { VencimentosPadraoList } from '@/components/modules/VencimentosPadrao/VencimentosPadraoList';
import { VencimentosPadraoEmptyState } from '@/components/modules/VencimentosPadrao/VencimentosPadraoEmptyState';
import { FormVencimentoPadrao } from '@/components/modules/FormVencimentoPadrao';

const VencimentosPadrao: React.FC = () => {
  const { vencimentos, loading, deleteVencimento } = useVencimentosPadrao();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cargoFilter, setCargoFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [vencimentoSelecionado, setVencimentoSelecionado] = useState<VencimentoPadrao | null>(null);

  console.log('[VencimentosPadrao] Renderizando página de Vencimentos Padrão com', vencimentos.length, 'vencimentos');

  const filteredVencimentos = vencimentos.filter(vencimento => {
    const matchesSearch = vencimento.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vencimento.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && vencimento.ativo) ||
                         (statusFilter === 'inactive' && !vencimento.ativo);
    const matchesCargo = cargoFilter === 'all' || vencimento.codigo === cargoFilter;
    
    return matchesSearch && matchesStatus && matchesCargo;
  });

  const handleNovoVencimento = () => {
    setVencimentoSelecionado(null);
    setModalOpen(true);
  };

  const handleEditarVencimento = (vencimento: VencimentoPadrao) => {
    setVencimentoSelecionado(vencimento);
    setModalOpen(true);
  };

  const handleExcluirVencimento = async (vencimento: VencimentoPadrao) => {
    if (window.confirm(`Tem certeza que deseja excluir o vencimento "${vencimento.descricao}"?`)) {
      console.log('[VencimentosPadrao] Confirmando exclusão do vencimento:', vencimento.codigo);
      await deleteVencimento(vencimento.id!);
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setVencimentoSelecionado(null);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setVencimentoSelecionado(null);
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
      <VencimentosPadraoHeader onNovoVencimento={handleNovoVencimento} />
      
      <VencimentosPadraoStats totalVencimentos={vencimentos.length} />
      
      <VencimentosPadraoFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        cargoFilter={cargoFilter}
        onCargoFilterChange={setCargoFilter}
      />

      {filteredVencimentos.length === 0 ? (
        <VencimentosPadraoEmptyState 
          searchTerm={searchTerm} 
          onNovoVencimento={handleNovoVencimento} 
        />
      ) : (
        <VencimentosPadraoList
          vencimentos={filteredVencimentos}
          onEdit={handleEditarVencimento}
          onDelete={handleExcluirVencimento}
        />
      )}

      <FormVencimentoPadrao
        open={modalOpen}
        onOpenChange={handleModalClose}
        vencimento={vencimentoSelecionado}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default VencimentosPadrao;
