import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContasPagar } from '@/hooks/useContasPagar';
import { ContasPagarHeader } from '@/components/financeiro/contas-pagar/ContasPagarHeader';
import { ContasPagarStats } from '@/components/financeiro/contas-pagar/ContasPagarStats';
import { ContasPagarFilters } from '@/components/financeiro/contas-pagar/ContasPagarFilters';
import { ContasPagarContent } from '@/components/financeiro/contas-pagar/ContasPagarContent';
import { ContasPagarModal } from '@/components/financeiro/contas-pagar/ContasPagarModal';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { ContaPagar, ContaPagarInput, ContaPagarFilters } from '@/types/contasPagar';



const ContasPagar = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | undefined>();
  const [contaParaExcluir, setContaParaExcluir] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<ContaPagarFilters>({});


  const {
    contasPagar,
    estatisticas,
    isLoading,
    isLoadingStats,
    error,
    criar,
    atualizar,
    remover,
    isCreating,
    isUpdating,
    isDeleting,
  } = useContasPagar(filtros);

  // Verificar se veio com parâmetro para editar um título específico
  useEffect(() => {
    const state = location.state as { editarTitulo?: string } | null;
    if (state?.editarTitulo && contasPagar) {
      const contaParaEditar = contasPagar.find(conta => conta.id === state.editarTitulo);
      if (contaParaEditar) {
        setContaSelecionada(contaParaEditar);
        setIsModalOpen(true);
        // Limpar o state para não reabrir o modal na próxima navegação
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, contasPagar]);

  const handleCreateClick = () => {
    setContaSelecionada(undefined);
    setIsModalOpen(true);
  };

  const handleEditClick = (conta: ContaPagar) => {
    setContaSelecionada(conta);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setContaSelecionada(undefined);
  };

  const handleSubmit = async (data: ContaPagarInput) => {
    return new Promise<void>((resolve, reject) => {
      const callback = {
        onSuccess: () => {
          handleModalClose();
          resolve();
        },
        onError: (error: Error) => {
          reject(error);
        }
      };

      if (contaSelecionada) {
        atualizar({ id: contaSelecionada.id, input: data });
      } else {
        criar(data);
      }
      
      // Como as mutations do React Query são assíncronas, vamos resolver imediatamente
      // O feedback de sucesso/erro já está sendo tratado no hook useContasPagar
      handleModalClose();
      resolve();
    });
  };

  const handleDelete = (id: string) => {
    setContaParaExcluir(id);
  };


  const handleFilter = (novosFiltros: ContaPagarFilters) => {
    setFiltros(novosFiltros);
  };

  if (error) {
    console.error('[ContasPagar] Erro ao carregar página:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erro ao carregar contas a pagar</h1>
          <p className="text-gray-600">{error.message || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ContasPagarHeader onCreateClick={handleCreateClick} />
      
      <ContasPagarStats estatisticas={estatisticas} />
      
      <ContasPagarFilters onFilter={handleFilter} />
      
      <ContasPagarContent
        contasPagar={contasPagar}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onCreateClick={handleCreateClick}
        isDeleting={isDeleting}
      />

      <ContasPagarModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        conta={contaSelecionada}
        isSubmitting={isCreating || isUpdating}
      />

      <ConfirmDialog
        open={!!contaParaExcluir}
        onOpenChange={(open) => !open && setContaParaExcluir(null)}
        title="Remover conta a pagar"
        description="Tem certeza que deseja remover esta conta a pagar? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => {
          if (contaParaExcluir) remover(contaParaExcluir);
          setContaParaExcluir(null);
        }}
      />
    </div>

  );
};

export default ContasPagar;
