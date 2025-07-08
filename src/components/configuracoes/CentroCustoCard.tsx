
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Hash, FileText, Edit, Trash2 } from 'lucide-react';
import type { CentroCusto } from '@/types/configuracoes';

interface CentroCustoCardProps {
  centroCusto: CentroCusto;
  onEdit: (centroCusto: CentroCusto) => void;
  onDelete: (centroCusto: CentroCusto) => void;
  loading?: boolean;
}

export const CentroCustoCard: React.FC<CentroCustoCardProps> = ({
  centroCusto,
  onEdit,
  onDelete,
  loading = false,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            {centroCusto.nome}
          </CardTitle>
          <Badge variant={centroCusto.ativo ? 'default' : 'secondary'}>
            {centroCusto.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {centroCusto.codigo && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="w-4 h-4" />
            <span>Código: {centroCusto.codigo}</span>
          </div>
        )}

        {centroCusto.descricao && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{centroCusto.descricao}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(centroCusto)}
            disabled={loading}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(centroCusto)}
            disabled={loading}
            className="flex-1"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remover
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
