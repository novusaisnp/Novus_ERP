
import React, { useState } from 'react';
import { useDescontosPadrao } from '@/hooks/useDescontosPadrao';
import { DescontoPadrao } from '@/types/rh';
import { DescontosPadraoHeader } from '@/components/modules/DescontosPadrao/DescontosPadraoHeader';
import { DescontosPadraoStats } from '@/components/modules/DescontosPadrao/DescontosPadraoStats';
import { DescontosPadraoFilters } from '@/components/modules/DescontosPadrao/DescontosPadraoFilters';
import { DescontosPadraoList } from '@/components/modules/DescontosPadrao/DescontosPadraoList';
import { DescontosPadraoEmptyState } from '@/components/modules/DescontosPadrao/DescontosPadraoEmptyState';
import { FormDescontoPadrao } from '@/components/modules/FormDescontoPadrao';

const DescontosPadrao: React.FC = () => {
  const { descontos, loading, deleteDesconto } = useDescontosPadrao();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [descontoSelecionado, setDescontoSelecionado] = useState<DescontoPadrao | null>(null);

  console.log('[DescontosPadrao] Renderizando página de Descontos Padrão com', descontos.length, 'descontos');

  const filteredDescontos = descontos.filter(desconto => {
    const matchesSearch = desconto.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         desconto.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && desconto.ativo) ||
                         (statusFilter === 'inactive' && !desconto.ativo);
    const matchesTipo = tipoFilter === 'all' || desconto.tipo === tipoFilter;
    
    return matchesSearch && matchesStatus && matchesTipo;
  });

  const handleNovoDesconto = () => {
    setDescontoSelecionado(null);
    setModalOpen(true);
  };

  const handleEditarDesconto = (desconto: DescontoPadrao) => {
    setDescontoSelecionado(desconto);
    setModalOpen(true);
  };

  const handleExcluirDesconto = async (desconto: DescontoPadrao) => {
    if (window.confirm(`Tem certeza que deseja excluir o desconto "${desconto.descricao}"?`)) {
      console.log('[DescontosPadrao] Confirmando exclusão do desconto:', desconto.codigo);
      await deleteDesconto(desconto.id!);
    }
  };

  const handleModalSuccess = () => {
    setModalOpen(false);
    setDescontoSelecionado(null);
  };

  const handleModalClose = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setDescontoSelecionado(null);
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
      <DescontosPadraoHeader onNovoDesconto={handleNovoDesconto} />
      
      <DescontosPadraoStats descontos={descontos} />
      
      <DescontosPadraoFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        tipoFilter={tipoFilter}
        onTipoFilterChange={setTipoFilter}
      />

      {filteredDescontos.length === 0 ? (
        <DescontosPadraoEmptyState 
          searchTerm={searchTerm} 
          onNovoDesconto={handleNovoDesconto} 
        />
      ) : (
        <DescontosPadraoList
          descontos={filteredDescontos}
          onEdit={handleEditarDesconto}
          onDelete={handleExcluirDesconto}
        />
      )}

      <FormDescontoPadrao
        open={modalOpen}
        onOpenChange={handleModalClose}
        desconto={descontoSelecionado}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default DescontosPadrao;
