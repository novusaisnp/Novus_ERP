import { useState } from 'react';
import { useContasReceber } from '@/hooks/useContasReceber';
import { ContasReceberHeader } from '@/components/financeiro/contas-receber/ContasReceberHeader';
import { ContasReceberStats } from '@/components/financeiro/contas-receber/ContasReceberStats';
import { ContasReceberFilters } from '@/components/financeiro/contas-receber/ContasReceberFilters';
import { ContasReceberContent } from '@/components/financeiro/contas-receber/ContasReceberContent';
import { ContaReceberFormModal } from '@/components/financeiro/contas-receber/ContaReceberFormModal';
import { ConfirmDeleteWithDeps } from '@/components/shared/ConfirmDeleteWithDeps';
import type {
  ContaReceber,
  ContaReceberFilters as ContaReceberFiltersType,
  ContaReceberInput,
} from '@/types/contasReceber';

const ContasReceber = () => {
  const [filtros, setFiltros] = useState<ContaReceberFiltersType>({});
  const [contaParaExcluir, setContaParaExcluir] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContaReceber | null>(null);

  const {
    contasReceber,
    estatisticas,
    isLoading,
    error,
    criar,
    atualizar,
    remover,
    isCreating,
    isUpdating,
    isDeleting,
  } = useContasReceber(filtros);

  const handleCreateClick = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEditClick = (conta: ContaReceber) => {
    setEditing(conta);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setContaParaExcluir(id);
  };

  const handleFilter = (novosFiltros: ContaReceberFiltersType) => {
    setFiltros(novosFiltros);
  };

  const handleSubmit = async (input: ContaReceberInput, id?: string) => {
    if (id) {
      await new Promise<void>((resolve, reject) => {
        atualizar(
          { id, input },
          { onSuccess: () => resolve(), onError: (e) => reject(e) },
        );
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        criar(input, { onSuccess: () => resolve(), onError: (e) => reject(e) });
      });
    }
    setModalOpen(false);
    setEditing(null);
  };

  if (error) {
    console.error('[ContasReceber] Erro detectado, mas continuando execução:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ContasReceberHeader onCreateClick={handleCreateClick} />
      <ContasReceberStats estatisticas={estatisticas} />
      <ContasReceberFilters onFilter={handleFilter} />
      <ContasReceberContent
        contasReceber={contasReceber}
        isLoading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        onCreateClick={handleCreateClick}
        isDeleting={isDeleting}
      />

      <ContaReceberFormModal
        isOpen={modalOpen}
        editing={editing}
        saving={isCreating || isUpdating}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmDeleteWithDeps
        open={!!contaParaExcluir}
        onOpenChange={(open) => !open && setContaParaExcluir(null)}
        entidade="contas_receber"
        id={contaParaExcluir ?? null}
        nomeRegistro="esta conta a receber"
        onConfirm={() => {
          if (contaParaExcluir) remover(contaParaExcluir);
          setContaParaExcluir(null);
        }}
      />

    </div>
  );
};

export default ContasReceber;
