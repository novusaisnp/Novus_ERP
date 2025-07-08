
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign } from 'lucide-react';

interface VencimentosPadraoHeaderProps {
  onNovoVencimento: () => void;
}

export const VencimentosPadraoHeader: React.FC<VencimentosPadraoHeaderProps> = ({
  onNovoVencimento
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Vencimentos Padrão
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie os vencimentos padrão por cargo
          </p>
        </div>
      </div>

      <Button 
        onClick={onNovoVencimento}
        className="flex items-center gap-2 px-4 py-2"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">Novo Vencimento</span>
        <span className="sm:hidden">Novo</span>
      </Button>
    </div>
  );
};
