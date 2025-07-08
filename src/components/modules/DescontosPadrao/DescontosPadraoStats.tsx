
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DescontoPadrao } from '@/types/rh';

interface DescontosPadraoStatsProps {
  descontos: DescontoPadrao[];
}

export const DescontosPadraoStats: React.FC<DescontosPadraoStatsProps> = ({
  descontos
}) => {
  const totalDescontos = descontos.length;
  const descontosAtivos = descontos.filter(d => d.ativo).length;
  const descontosInativos = descontos.filter(d => !d.ativo).length;

  const stats = [
    {
      title: "Total de Descontos",
      value: totalDescontos,
      description: "Descontos cadastrados"
    },
    {
      title: "Ativos",
      value: descontosAtivos,
      description: "Em uso na folha"
    },
    {
      title: "Inativos",
      value: descontosInativos,
      description: "Desabilitados"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
