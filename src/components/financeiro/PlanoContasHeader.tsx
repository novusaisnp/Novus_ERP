
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface PlanoContasHeaderProps {
  onCreateClick: () => void;
}

export const PlanoContasHeader: React.FC<PlanoContasHeaderProps> = ({
  onCreateClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plano de Contas</h1>
        <p className="text-muted-foreground">
          Gerencie a estrutura hierárquica de contas do seu ERP
        </p>
      </div>
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Nova Conta
      </Button>
    </div>
  );
};
