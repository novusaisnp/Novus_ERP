
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus } from 'lucide-react';

interface CentroCustoEmptyStateProps {
  onAddNew: () => void;
}

export const CentroCustoEmptyState: React.FC<CentroCustoEmptyStateProps> = ({
  onAddNew,
}) => {
  return (
    <EmptyState
      icon={Building2}
      title="Nenhum Centro de Custo Cadastrado"
      description="Comece criando seu primeiro centro de custo para organizar melhor os custos da sua empresa."
      action={{
        label: 'Criar Primeiro Centro de Custo',
        onClick: onAddNew,
        icon: Plus,
      }}
    />
  );
};
