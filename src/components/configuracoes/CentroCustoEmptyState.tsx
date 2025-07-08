
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';

interface CentroCustoEmptyStateProps {
  onAddNew: () => void;
}

export const CentroCustoEmptyState: React.FC<CentroCustoEmptyStateProps> = ({
  onAddNew,
}) => {
  return (
    <Card className="bg-gray-50">
      <CardContent className="p-8">
        <div className="text-center">
          <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhum Centro de Custo Cadastrado
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Comece criando seu primeiro centro de custo para organizar melhor 
            os custos da sua empresa.
          </p>
          <Button onClick={onAddNew} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Primeiro Centro de Custo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
