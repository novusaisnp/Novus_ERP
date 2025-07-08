
import { Banco } from '@/types/banco';
import { BancoCard } from './BancoCard';
import { BancoEmptyState } from './BancoEmptyState';

interface BancosContentProps {
  bancos: Banco[];
  isLoading: boolean;
  onEdit: (banco: Banco) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onCreateClick: () => void;
  isArchiving?: boolean;
  isRestoring?: boolean;
}

export const BancosContent = ({
  bancos,
  isLoading,
  onEdit,
  onArchive,
  onRestore,
  onCreateClick,
  isArchiving,
  isRestoring,
}: BancosContentProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="h-48 bg-gray-200 animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (bancos.length === 0) {
    return <BancoEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bancos.map((banco) => (
        <BancoCard
          key={banco.id}
          banco={banco}
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
