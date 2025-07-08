
import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DescontoPadrao } from '@/types/rh';

interface DescontoPadraoCardProps {
  desconto: DescontoPadrao;
  onEdit: (desconto: DescontoPadrao) => void;
  onDelete: (desconto: DescontoPadrao) => void;
}

export const DescontoPadraoCard: React.FC<DescontoPadraoCardProps> = ({
  desconto,
  onEdit,
  onDelete
}) => {
  const formatarValor = (desconto: DescontoPadrao) => {
    if (desconto.tipo === 'FIXO' && desconto.valor) {
      return `R$ ${desconto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    if (desconto.tipo === 'PERCENTUAL' && desconto.percentual) {
      return `${desconto.percentual}%`;
    }
    if (desconto.tipo === 'TABELA') {
      return 'Tabela Progressiva';
    }
    return '-';
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'FIXO':
        return 'default';
      case 'PERCENTUAL':
        return 'secondary';
      case 'TABELA':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">
                {desconto.codigo}
              </h3>
              <Badge variant={getBadgeVariant(desconto.tipo)}>
                {desconto.tipo}
              </Badge>
              <Badge variant={desconto.ativo ? "default" : "secondary"}>
                {desconto.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {desconto.descricao}
            </p>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(desconto)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(desconto)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Valor:
          </span>
          <span className="font-medium">
            {formatarValor(desconto)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
