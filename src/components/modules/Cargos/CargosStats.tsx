
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';

interface CargosStatsProps {
  totalCargos: number;
}

export const CargosStats: React.FC<CargosStatsProps> = ({ totalCargos }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total de Cargos</CardTitle>
        <Briefcase className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalCargos}</div>
        <p className="text-xs text-muted-foreground">
          cargos cadastrados
        </p>
      </CardContent>
    </Card>
  );
};
