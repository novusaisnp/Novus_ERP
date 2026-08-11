
import { EmptyState } from '@/components/ui/empty-state';
import { Building2, Plus } from 'lucide-react';

interface BancoEmptyStateProps {
  onCreateClick: () => void;
}

export const BancoEmptyState = ({ onCreateClick }: BancoEmptyStateProps) => {
  return (
    <EmptyState
      className="mt-8"
      icon={Building2}
      title="Nenhum banco encontrado"
      description="Comece cadastrando o primeiro banco da sua empresa. Você pode buscar automaticamente na base de dados do Banco Central ou cadastrar manualmente."
      action={{
        label: 'Cadastrar Primeiro Banco',
        onClick: onCreateClick,
        icon: Plus,
      }}
    />
  );
};
