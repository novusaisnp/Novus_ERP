
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

interface PlanoContasStatsProps {
  totalContas: number;
  contasReceita: number;
  contasDespesa: number;
  contasAtivas: number;
}

export const PlanoContasStats: React.FC<PlanoContasStatsProps> = ({
  totalContas,
  contasReceita,
  contasDespesa,
  contasAtivas,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Contas</p>
              <p className="text-2xl font-bold">{totalContas}</p>
            </div>
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receitas</p>
              <p className="text-2xl font-bold text-green-600">{contasReceita}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Despesas</p>
              <p className="text-2xl font-bold text-red-600">{contasDespesa}</p>
            </div>
            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contas Ativas</p>
              <p className="text-2xl font-bold">{contasAtivas}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              {totalContas > 0 ? ((contasAtivas / totalContas) * 100).toFixed(0) : 0}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
