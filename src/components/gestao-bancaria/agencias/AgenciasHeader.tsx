
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AgenciasHeaderProps {
  onCreateClick: () => void;
}

export const AgenciasHeader: React.FC<AgenciasHeaderProps> = ({ onCreateClick }) => {
  console.log('[AgenciasHeader] Componente renderizado');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Agências Bancárias</h1>
        <p className="text-muted-foreground">
          Gerencie as agências bancárias vinculadas aos bancos cadastrados
        </p>
      </div>
      
      <Button 
        onClick={onCreateClick}
        className="flex items-center gap-2 w-full sm:w-auto"
      >
        <Plus className="h-4 w-4" />
        Nova Agência
      </Button>
    </div>
  );
};
