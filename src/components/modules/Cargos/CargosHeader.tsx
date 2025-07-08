
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CargosHeaderProps {
  onNovoCargo: () => void;
}

export const CargosHeader: React.FC<CargosHeaderProps> = ({ onNovoCargo }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Cargos</h1>
        <p className="text-muted-foreground">
          Gerencie os cargos da empresa
        </p>
      </div>
      <Button onClick={onNovoCargo} className="flex items-center gap-2 w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        Novo Cargo
      </Button>
    </div>
  );
};
