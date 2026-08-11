
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Briefcase, Plus } from 'lucide-react';

interface CargosEmptyStateProps {
  searchTerm: string;
  onNovoCargo: () => void;
}

export const CargosEmptyState: React.FC<CargosEmptyStateProps> = ({ searchTerm, onNovoCargo }) => {
  return (
    <EmptyState
      icon={Briefcase}
      title="Nenhum cargo encontrado"
      description={
        searchTerm
          ? 'Tente ajustar os filtros de pesquisa'
          : 'Comece cadastrando seu primeiro cargo'
      }
      action={
        searchTerm
          ? undefined
          : { label: 'Cadastrar Cargo', onClick: onNovoCargo, icon: Plus }
      }
    />
  );
};
