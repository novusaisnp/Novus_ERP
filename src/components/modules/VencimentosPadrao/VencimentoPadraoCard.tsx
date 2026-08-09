
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VencimentoPadrao } from '@/types/rh';
import { Edit, Trash2, DollarSign, Percent, Calculator } from 'lucide-react';

interface VencimentoPadraoCardProps {
  vencimento: VencimentoPadrao;
  onEdit: (vencimento: VencimentoPadrao) => void;
  onDelete: (vencimento: VencimentoPadrao) => void;
}

export const VencimentoPadraoCard: React.FC<VencimentoPadraoCardProps> = ({
  vencimento,
  onEdit,
  onDelete
}) => {
  const getIconByType = () => {
    switch (vencimento.tipo) {
      case 'FIXO':
        return <DollarSign className="w-4 h-4" />;
      case 'PERCENTUAL':
        return <Percent className="w-4 h-4" />;
      case 'HORAS':
        return <Calculator className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getValueDisplay = () => {
    if (vencimento.tipo === 'FIXO' && vencimento.valor) {
      return `R$ ${vencimento.valor.toFixed(2)}`;
    }
    if (vencimento.tipo === 'PERCENTUAL' && vencimento.percentual) {
      return `${vencimento.percentual}%`;
    }
    if (vencimento.tipo === 'HORAS' && vencimento.percentual) {
      return `${vencimento.percentual}%`;
    }
    return 'Não definido';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getIconByType()}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {vencimento.descricao}
                </h3>
                <p className="text-sm text-gray-600">
                  Código: {vencimento.codigo}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant={vencimento.ativo ? "default" : "secondary"}>
                {vencimento.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
              <Badge variant="outline">
                {vencimento.tipo}
              </Badge>
              <Badge variant="outline">
                {getValueDisplay()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
              <div>
                <span className="font-medium">INSS:</span> {vencimento.incideInss ? 'Sim' : 'Não'}
              </div>
              <div>
                <span className="font-medium">IRRF:</span> {vencimento.incideIrrf ? 'Sim' : 'Não'}
              </div>
              <div>
                <span className="font-medium">FGTS:</span> {vencimento.incideFgts ? 'Sim' : 'Não'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(vencimento)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(vencimento)}
              className="flex items-center gap-2 text-status-cancelled hover:text-status-cancelled hover:bg-status-cancelled/10"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
