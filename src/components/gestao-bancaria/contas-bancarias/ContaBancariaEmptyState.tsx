
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Plus } from 'lucide-react';

interface ContaBancariaEmptyStateProps {
  onCreateClick: () => void;
}

export const ContaBancariaEmptyState = ({ onCreateClick }: ContaBancariaEmptyStateProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma conta bancária encontrada
        </h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          Comece criando sua primeira conta bancária ou conta cofre para controlar as movimentações financeiras.
        </p>
        <Button onClick={onCreateClick} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Primeira Conta
        </Button>
      </CardContent>
    </Card>
  );
};
