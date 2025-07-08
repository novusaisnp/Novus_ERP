
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, Vault, DollarSign } from 'lucide-react';
import { ContaBancariaEstatisticas } from '@/types/contaBancaria';

interface ContasBancariasStatsProps {
  estatisticas?: ContaBancariaEstatisticas;
}

export const ContasBancariasStats = ({ estatisticas }: ContasBancariasStatsProps) => {
  if (!estatisticas) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const stats = [
    {
      title: 'Total de Contas',
      value: estatisticas.total,
      icon: Building2,
      description: `${estatisticas.ativas} ativas, ${estatisticas.inativas} inativas`,
    },
    {
      title: 'Contas Corrente',
      value: estatisticas.contas_corrente,
      icon: CreditCard,
      description: 'Contas para movimentação',
    },
    {
      title: 'Contas Cofre',
      value: estatisticas.contas_cofre,
      icon: Vault,
      description: 'Contas para controle interno',
    },
    {
      title: 'Saldo Total',
      value: formatCurrency(estatisticas.saldo_total),
      icon: DollarSign,
      description: `Limite: ${formatCurrency(estatisticas.limite_total)}`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
