
import { useState } from 'react';
import { useContasReceber } from '@/hooks/useContasReceber';
import { ContasReceberHeader } from '@/components/financeiro/contas-receber/ContasReceberHeader';
import { ContasReceberStats } from '@/components/financeiro/contas-receber/ContasReceberStats';
import { ContasReceberFilters } from '@/components/financeiro/contas-receber/ContasReceberFilters';
import { ContasReceberContent } from '@/components/financeiro/contas-receber/ContasReceberContent';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ContaReceber, ContaReceberFilters } from '@/types/contasReceber';


const ContasReceber = () => {
  const [filtros, setFiltros] = useState<ContaReceberFilters>({});
  const [contaParaExcluir, setContaParaExcluir] = useState<string | null>(null);


  const {
    contasReceber,
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
  } = useContasReceber(filtros);

  const handleCreateClick = () => {
    // TODO: Implementar modal de criação
  };

  const handleEditClick = (conta: ContaReceber) => {
    // TODO: Implementar modal de edição
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta conta a receber?')) {
      remover(id);
    }
  };

  const handleFilter = (novosFiltros: ContaReceberFilters) => {
    setFiltros(novosFiltros);
  };

  // Tratamento de erro mais amigável - não quebrar a página
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
    </div>
  );
};

export default ContasReceber;
