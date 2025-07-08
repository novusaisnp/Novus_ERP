
import { ContaBancaria } from '@/types/contaBancaria';
import { ContaBancariaCard } from './ContaBancariaCard';
import { ContaBancariaEmptyState } from './ContaBancariaEmptyState';
import { Skeleton } from '@/components/ui/skeleton';

interface ContasBancariasContentProps {
  contasBancarias: ContaBancaria[];
  isLoading: boolean;
  onEdit: (conta: ContaBancaria) => void;
  onArchive: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onCreateClick: () => void;
  isArchiving: boolean;
  isRestoring: boolean;
}

export const ContasBancariasContent = ({
  contasBancarias,
  isLoading,
  onEdit,
  onArchive,
  onRestore,
  onCreateClick,
  isArchiving,
  isRestoring,
}: ContasBancariasContentProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-48" />
        ))}
      </div>
    );
  }

  if (!contasBancarias || contasBancarias.length === 0) {
    return <ContaBancariaEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contasBancarias.map((conta) => (
        <ContaBancariaCard
          key={conta.id}
          conta={conta}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          isArchiving={isArchiving}
          isRestoring={isRestoring}
        />
      ))}
    </div>
  );
};
