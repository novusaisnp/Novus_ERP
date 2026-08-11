import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Receipt } from 'lucide-react';

interface ContasReceberEmptyStateProps {
  onCreateClick: () => void;
}

export const ContasReceberEmptyState = ({ onCreateClick }: ContasReceberEmptyStateProps) => {
  console.log('[ContasReceberEmptyState] Renderizando estado vazio');

  return (
    <EmptyState
      icon={Receipt}
      title="Nenhuma conta a receber encontrada"
      description="Comece criando sua primeira conta a receber ou ajuste os filtros de busca para encontrar contas existentes."
      action={{
        label: 'Criar Primeira Conta a Receber',
        onClick: onCreateClick,
        icon: Plus,
      }}
    />
  );
};