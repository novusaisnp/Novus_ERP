
import React from 'react';
import { Plus, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface DescontosPadraoEmptyStateProps {
  searchTerm: string;
  onNovoDesconto: () => void;
}

export const DescontosPadraoEmptyState: React.FC<DescontosPadraoEmptyStateProps> = ({
  searchTerm,
  onNovoDesconto
}) => {
  if (searchTerm) {
    return (
      <EmptyState
        icon={Search}
        title="Nenhum desconto encontrado"
        description="Não encontramos descontos que correspondam aos filtros aplicados. Tente ajustar sua busca ou filtros."
      />
    );
  }

  return (
    <EmptyState
      icon={Plus}
      title="Nenhum desconto cadastrado"
      description="Comece criando seu primeiro desconto padrão para ser usado na folha de pagamento."
      action={{
        label: 'Criar Primeiro Desconto',
        onClick: onNovoDesconto,
        icon: Plus,
      }}
    />
  );
};
