// [Refatoração] Mudança para Gestão Bancária

import { useState } from 'react';
import { useContasBancarias } from '@/hooks/useContasBancarias';
import { ContasBancariasHeader } from '@/components/gestao-bancaria/contas-bancarias/ContasBancariasHeader';
import { ContasBancariasStats } from '@/components/gestao-bancaria/contas-bancarias/ContasBancariasStats';
import { ContasBancariasFilters } from '@/components/gestao-bancaria/contas-bancarias/ContasBancariasFilters';
import { ContasBancariasContent } from '@/components/gestao-bancaria/contas-bancarias/ContasBancariasContent';
import { ContasBancariasModal } from '@/components/gestao-bancaria/contas-bancarias/ContasBancariasModal';
import { ContaBancaria, ContaBancariaInput, ContaBancariaFilters } from '@/types/contaBancaria';

console.log('[GestaoBancaria] Página de contas bancárias carregada');

const ContasBancarias = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaBancaria | undefined>();
  const [filtros, setFiltros] = useState<ContaBancariaFilters>({});

  const {
    contasBancarias,
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
  } = useContasBancarias(filtros);

  const handleCreateClick = () => {
    setContaSelecionada(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (conta: ContaBancaria) => {
    setContaSelecionada(conta);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setContaSelecionada(undefined);
  };

  const handleSubmit = (data: ContaBancariaInput) => {
    if (contaSelecionada) {
      atualizar(
        { id: contaSelecionada.id, input: data },
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

  const handleArchive = async (id: string): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      arquivar(id, {
        onSuccess: () => resolve(true),
        onError: (error) => {
          console.error('[GestaoBancaria] Erro ao arquivar conta:', error);
          resolve(false);
        },
      });
    });
  };

  const handleRestore = async (id: string): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
      restaurar(id, {
        onSuccess: () => resolve(true),
        onError: (error) => {
          console.error('[GestaoBancaria] Erro ao restaurar conta:', error);
          resolve(false);
        },
      });
    });
  };

  const handleFilter = (novosFiltros: ContaBancariaFilters) => {
    console.log('[GestaoBancaria] Aplicando filtros:', novosFiltros);
    setFiltros(novosFiltros);
  };

  if (error) {
    console.error('[GestaoBancaria] Erro ao carregar página:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-status-cancelled mb-4">Erro ao carregar contas bancárias</h1>
          <p className="text-gray-600">{error.message || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ContasBancariasHeader onCreateClick={handleCreateClick} />
      
      <ContasBancariasStats estatisticas={estatisticas} />
      
      <ContasBancariasFilters onFilter={handleFilter} />
      
      <ContasBancariasContent
        contasBancarias={contasBancarias}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onArchive={handleArchive}
        onRestore={handleRestore}
        onCreateClick={handleCreateClick}
        isArchiving={isArchiving}
        isRestoring={isRestoring}
      />

      <ContasBancariasModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        conta={contaSelecionada}
        isSubmitting={isCreating || isUpdating}
      />
    </div>
  );
};

export default ContasBancarias;