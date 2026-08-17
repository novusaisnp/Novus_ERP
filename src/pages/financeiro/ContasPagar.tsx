import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useContasPagar, useContaPagar } from '@/hooks/useContasPagar';
import { ContasPagarHeader } from '@/components/financeiro/contas-pagar/ContasPagarHeader';
import { ContasPagarStats } from '@/components/financeiro/contas-pagar/ContasPagarStats';
import { ContasPagarFilters } from '@/components/financeiro/contas-pagar/ContasPagarFilters';
import { ContasPagarContent } from '@/components/financeiro/contas-pagar/ContasPagarContent';
import { ContasPagarModal } from '@/components/financeiro/contas-pagar/ContasPagarModal';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import { PaginationFooter } from '@/components/shared/PaginationFooter';
import { ContaPagar, ContaPagarInput, ContaPagarFilters } from '@/types/contasPagar';

const PAGE_SIZE = 50;

const ContasPagar = () => {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagar | undefined>();
  const [contaParaExcluir, setContaParaExcluir] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<ContaPagarFilters>({});
  const [page, setPage] = useState(0);


  const {
    contasPagar,
    total,
    estatisticas,
    isLoading,
    isFetching,
    isLoadingStats,
    error,
    criar,
    atualizar,
    remover,
    isCreating,
    isUpdating,
    isDeleting,
  } = useContasPagar(filtros, { page, pageSize: PAGE_SIZE });

  // Verificar se veio com parâmetro para editar um título específico — busca
  // direta por id (getById), não depende da conta estar na página atual.
  const state = location.state as { editarTitulo?: string } | null;
  const { conta: contaParaEditar } = useContaPagar(state?.editarTitulo ?? '');
  useEffect(() => {
    if (state?.editarTitulo && contaParaEditar) {
      setContaSelecionada(contaParaEditar);
      setIsModalOpen(true);
      // Limpar o state para não reabrir o modal na próxima navegação
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.editarTitulo, contaParaEditar]);

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
    if (contaSelecionada) {
      await new Promise<void>((resolve, reject) => {
        atualizar(
          { id: contaSelecionada.id, input: data },
          { onSuccess: () => resolve(), onError: (error: Error) => reject(error) },
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        criar(data, { onSuccess: () => resolve(), onError: (error: Error) => reject(error) });
      });
    }
    handleModalClose();
  };

  const handleDelete = (id: string) => {
    setContaParaExcluir(id);
  };


  const handleFilter = (novosFiltros: ContaPagarFilters) => {
    setFiltros(novosFiltros);
    setPage(0);
  };

  if (error) {
    console.error('[ContasPagar] Erro ao carregar página:', error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-status-cancelled mb-4">Erro ao carregar contas a pagar</h1>
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

      {!isLoading && contasPagar.length > 0 && (
        <PaginationFooter
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          isFetching={isFetching}
          onPageChange={setPage}
        />
      )}

      <ContasPagarModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        conta={contaSelecionada}
        isSubmitting={isCreating || isUpdating}
      />

      <ConfirmDeleteWithDeps
        open={!!contaParaExcluir}
        onOpenChange={(open) => !open && setContaParaExcluir(null)}
        entidade="contas_pagar"
        id={contaParaExcluir ?? null}
        nomeRegistro="esta conta a pagar"
        onConfirm={() => {
          if (contaParaExcluir) remover(contaParaExcluir);
          setContaParaExcluir(null);
        }}
      />

    </div>

  );
};

export default ContasPagar;
