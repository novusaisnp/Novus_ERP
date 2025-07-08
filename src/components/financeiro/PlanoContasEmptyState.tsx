
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PlanoContasEmptyStateProps {
  searchTerm: string;
  onCreateClick: () => void;
}

export const PlanoContasEmptyState: React.FC<PlanoContasEmptyStateProps> = ({
  searchTerm,
  onCreateClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
      <p className="text-muted-foreground mb-4">
        {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira conta'}
      </p>
      {!searchTerm && (
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Primeira Conta
        </Button>
      )}
    </div>
  );
};
