
import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum desconto encontrado
          </h3>
          <p className="text-muted-foreground text-center mb-6">
            Não encontramos descontos que correspondam aos filtros aplicados.
            Tente ajustar sua busca ou filtros.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Nenhum desconto cadastrado
        </h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Comece criando seu primeiro desconto padrão para ser usado na folha de pagamento.
        </p>
        <Button onClick={onNovoDesconto}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeiro Desconto
        </Button>
      </CardContent>
    </Card>
  );
};
