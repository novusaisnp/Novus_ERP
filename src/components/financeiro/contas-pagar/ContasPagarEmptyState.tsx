
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Plus } from 'lucide-react';

interface ContasPagarEmptyStateProps {
  onCreateClick: () => void;
}

export const ContasPagarEmptyState = ({ onCreateClick }: ContasPagarEmptyStateProps) => {
  return (
    <EmptyState
      icon={FileText}
      title="Nenhuma conta a pagar encontrada"
      description="Comece adicionando sua primeira conta a pagar para gerenciar seus compromissos financeiros"
      action={{
        label: 'Adicionar Primeira Conta',
        onClick: onCreateClick,
        icon: Plus,
      }}
    />
  );
};
