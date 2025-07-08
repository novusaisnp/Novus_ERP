
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';

interface CargosEmptyStateProps {
  searchTerm: string;
  onNovoCargo: () => void;
}

export const CargosEmptyState: React.FC<CargosEmptyStateProps> = ({ searchTerm, onNovoCargo }) => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum cargo encontrado</h3>
        <p className="text-muted-foreground mb-4">
          {searchTerm 
            ? 'Tente ajustar os filtros de pesquisa'
            : 'Comece cadastrando seu primeiro cargo'
          }
        </p>
        {!searchTerm && (
          <Button onClick={onNovoCargo}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Cargo
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
