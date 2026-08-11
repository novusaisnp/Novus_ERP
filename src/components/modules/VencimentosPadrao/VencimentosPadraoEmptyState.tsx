
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { DollarSign, Plus } from 'lucide-react';

interface VencimentosPadraoEmptyStateProps {
  searchTerm: string;
  onNovoVencimento: () => void;
}

export const VencimentosPadraoEmptyState: React.FC<VencimentosPadraoEmptyStateProps> = ({
  searchTerm,
  onNovoVencimento
}) => {
  return (
    <EmptyState
      icon={DollarSign}
      title={searchTerm ? 'Nenhum vencimento encontrado' : 'Nenhum vencimento cadastrado'}
      description={
        searchTerm
          ? `Não encontramos vencimentos que correspondam à sua busca por "${searchTerm}".`
          : 'Comece cadastrando o primeiro vencimento padrão da sua empresa.'
      }
      action={{
        label: 'Cadastrar Vencimento',
        onClick: onNovoVencimento,
        icon: Plus,
      }}
    />
  );
};
