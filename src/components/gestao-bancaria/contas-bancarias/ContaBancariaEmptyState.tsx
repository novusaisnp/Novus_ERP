
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus } from 'lucide-react';

interface ContaBancariaEmptyStateProps {
  onCreateClick: () => void;
}

export const ContaBancariaEmptyState = ({ onCreateClick }: ContaBancariaEmptyStateProps) => {
  return (
    <EmptyState
      icon={Building2}
      title="Nenhuma conta bancária encontrada"
      description="Comece criando sua primeira conta bancária ou conta cofre para controlar as movimentações financeiras."
      action={{
        label: 'Criar Primeira Conta',
        onClick: onCreateClick,
        icon: Plus,
      }}
    />
  );
};
