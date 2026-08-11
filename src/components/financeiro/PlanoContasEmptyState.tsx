
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus } from 'lucide-react';

interface PlanoContasEmptyStateProps {
  searchTerm: string;
  onCreateClick: () => void;
}

export const PlanoContasEmptyState: React.FC<PlanoContasEmptyStateProps> = ({
  searchTerm,
  onCreateClick,
}) => {
  return (
    <EmptyState
      icon={Plus}
      title="Nenhuma conta encontrada"
      description={searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira conta'}
      action={
        searchTerm
          ? undefined
          : { label: 'Criar Primeira Conta', onClick: onCreateClick, icon: Plus }
      }
    />
  );
};
