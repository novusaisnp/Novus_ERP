
import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AgenciaEmptyStateProps {
  onCreateClick: () => void;
}

export const AgenciaEmptyState: React.FC<AgenciaEmptyStateProps> = ({ onCreateClick }) => {
  console.log('[AgenciaEmptyState] Componente renderizado');

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-6">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhuma agência cadastrada
          </h3>
          <p className="text-muted-foreground max-w-md">
            Comece cadastrando sua primeira agência bancária. As agências são vinculadas aos bancos já cadastrados no sistema.
          </p>
        </div>
        
        <Button onClick={onCreateClick} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Cadastrar primeira agência
        </Button>
      </CardContent>
    </Card>
  );
};
