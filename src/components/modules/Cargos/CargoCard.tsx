
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Briefcase } from 'lucide-react';
import { Cargo } from '@/types/rh';
import { rhUtils } from '@/utils/rhUtils';

interface CargoCardProps {
  cargo: Cargo;
  onEdit: (cargo: Cargo) => void;
  onDelete: (cargo: Cargo) => void;
}

export const CargoCard: React.FC<CargoCardProps> = ({ cargo, onEdit, onDelete }) => {
  console.log('[Cargos] Renderizando CargoCard para:', cargo.nome);
  
  const handleEdit = () => {
    console.log('[Cargos] Editando cargo:', cargo.nome);
    onEdit(cargo);
  };

  const handleDelete = () => {
    console.log('[Cargos] Excluindo cargo:', cargo.nome);
    onDelete(cargo);
  };

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{cargo.nome}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Ativo
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {cargo.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {cargo.descricao}
          </p>
        )}
        
        {cargo.salarioBase && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Salário Base:
            </span>
            <span className="text-sm font-semibold text-status-delivered">
              {rhUtils.formatCurrency(cargo.salarioBase)}
            </span>
          </div>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
