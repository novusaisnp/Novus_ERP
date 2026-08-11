
import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface AgenciaEmptyStateProps {
  onCreateClick: () => void;
}

export const AgenciaEmptyState: React.FC<AgenciaEmptyStateProps> = ({ onCreateClick }) => {
  console.log('[AgenciaEmptyState] Componente renderizado');

  return (
    <EmptyState
      icon={Building2}
      title="Nenhuma agência cadastrada"
      description="Comece cadastrando sua primeira agência bancária. As agências são vinculadas aos bancos já cadastrados no sistema."
      action={{
        label: 'Cadastrar primeira agência',
        onClick: onCreateClick,
        icon: Plus,
      }}
    />
  );
};
