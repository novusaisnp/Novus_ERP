
import { useState } from 'react';
import { useAgencias } from '@/hooks/useAgencias';
import { AgenciasHeader } from '@/components/financeiro/agencias/AgenciasHeader';
import { AgenciasStats } from '@/components/financeiro/agencias/AgenciasStats';
import { AgenciasFilters } from '@/components/financeiro/agencias/AgenciasFilters';
import { AgenciasContent } from '@/components/financeiro/agencias/AgenciasContent';
import { AgenciasModal } from '@/components/financeiro/agencias/AgenciasModal';
import { Agencia, AgenciaInput, AgenciaFilters as FiltrosType } from '@/types/agencia';

console.log('[Agencias] Página de agências carregada');

const Agencias = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agenciaSelecionada, setAgenciaSelecionada] = useState<Agencia | undefined>();
  const [filtros, setFiltros] = useState<FiltrosType>({});

  const {
    agencias,
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
  } = useAgencias(filtros);

  const handleCreateClick = () => {
    setAgenciaSelecionada(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (agencia: Agencia) => {
    setAgenciaSelecionada(agencia);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setAgenciaSelecionada(undefined);
  };

  const handleSubmit = (data: AgenciaInput) => {
    if (agenciaSelecionada) {
      atualizar(
        { id: agenciaSelecionada.id, input: data },
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

  const handleArchive = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      arquivar(id, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const handleRestore = async (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      restaurar(id, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const handleFilter = (novosFiltros: FiltrosType) => {
    console.log('[Agencias] Aplicando filtros:', novosFiltros);
    setFiltros(novosFiltros);
  };

  if (error) {
    console.error('[Agencias] Erro ao carregar página:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar agências</h1>
          <p className="text-gray-600">{error.message || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <AgenciasHeader onCreateClick={handleCreateClick} />
      
      <AgenciasStats estatisticas={estatisticas} />
      
      <AgenciasFilters onFilter={handleFilter} />
      
      <AgenciasContent
        agencias={agencias}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onCreateClick={handleCreateClick}
        isArchiving={isArchiving}
        isRestoring={isRestoring}
      />

      <AgenciasModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        agencia={agenciaSelecionada}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
};

export default Agencias;
