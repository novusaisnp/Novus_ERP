// [Refatoração] Mudança para Gestão Bancária

import { useState } from 'react';
import { useBancos } from '@/hooks/useBancos';
import { BancosHeader } from '@/components/gestao-bancaria/bancos/BancosHeader';
import { BancosStats } from '@/components/gestao-bancaria/bancos/BancosStats';
import { BancosFilters } from '@/components/gestao-bancaria/bancos/BancosFilters';
import { BancosContent } from '@/components/gestao-bancaria/bancos/BancosContent';
import { BancosModal } from '@/components/gestao-bancaria/bancos/BancosModal';
import { Banco, BancoInput } from '@/types/banco';

console.log('[GestaoBancaria] Página de bancos carregada');

const Bancos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bancoSelecionado, setBancoSelecionado] = useState<Banco | undefined>();
  const [filtros, setFiltros] = useState<{
    codigo?: string;
    nome?: string;
    pais?: string;
    ativo?: boolean;
    incluirArquivados?: boolean;
  }>({});

  const {
    bancos,
    estatisticas,
    isLoading,
    error,
    criar,
    atualizar,
    arquivar,
    restaurar,
    isCreating,
    isUpdating,
    isArchiving,
    isRestoring,
  } = useBancos(filtros);

  const handleCreateClick = () => {
    setBancoSelecionado(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (banco: Banco) => {
    setBancoSelecionado(banco);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setBancoSelecionado(undefined);
  };

  const handleSubmit = (data: BancoInput) => {
    if (bancoSelecionado) {
      atualizar(
        { id: bancoSelecionado.id, input: data },
        {
          onSuccess: () => {
            handleModalClose();
          },
        }
      );
    } else {
      criar(data, {
        onSuccess: () => {
          handleModalClose();
        },
      });
    }
  };

  const handleArchive = (id: string) => {
    arquivar(id);
  };

  const handleRestore = (id: string) => {
    restaurar(id);
  };

  const handleFilter = (novosFiltros: typeof filtros) => {
    console.log('[GestaoBancaria] Aplicando filtros:', novosFiltros);
    setFiltros(novosFiltros);
  };

  if (error) {
    console.error('[GestaoBancaria] Erro ao carregar página:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar bancos</h1>
          <p className="text-gray-600">{error.message || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BancosHeader onCreateClick={handleCreateClick} />
      
      <BancosStats estatisticas={estatisticas} />
      
      <BancosFilters onFilter={handleFilter} />
      
      <BancosContent
        bancos={bancos}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onCreateClick={handleCreateClick}
        isArchiving={isArchiving}
        isRestoring={isRestoring}
      />

      <BancosModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        banco={bancoSelecionado}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
};

export default Bancos;