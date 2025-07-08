
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DescontosPadraoHeaderProps {
  onNovoDesconto: () => void;
}

export const DescontosPadraoHeader: React.FC<DescontosPadraoHeaderProps> = ({
  onNovoDesconto
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Descontos Padrão
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os descontos padrão aplicados na folha de pagamento
        </p>
      </div>
      
      <Button onClick={onNovoDesconto} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Novo Desconto
      </Button>
    </div>
  );
};
