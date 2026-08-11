import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContaReceberEstatisticas } from '@/types/contasReceber';

interface ContasReceberStatsProps {
  estatisticas?: ContaReceberEstatisticas;
}

export const ContasReceberStats = ({ estatisticas }: ContasReceberStatsProps) => {
  console.log('[ContasReceberStats] Renderizando estatísticas:', estatisticas);

  if (!estatisticas) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Contas</CardTitle>
          <div className="rounded-md bg-accent-vivid-soft p-1.5">
            <TrendingUp className="h-4 w-4 text-accent-vivid" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-tabular">{estatisticas.total_contas}</div>
          <p className="text-xs text-muted-foreground">
            Todas as contas a receber
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
          <div className="rounded-md bg-status-confirmed/10 p-1.5">
            <AlertCircle className="h-4 w-4 text-status-confirmed" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-confirmed font-tabular">
            {estatisticas.contas_abertas}
          </div>
          <p className="text-xs text-muted-foreground font-tabular">
            {formatCurrency(estatisticas.valor_total_aberto)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          <div className="rounded-md bg-status-cancelled/10 p-1.5">
            <TrendingDown className="h-4 w-4 text-status-cancelled" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-cancelled font-tabular">
            {estatisticas.contas_vencidas}
          </div>
          <p className="text-xs text-muted-foreground font-tabular">
            {formatCurrency(estatisticas.valor_total_vencido)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
          <div className="rounded-md bg-status-delivered/10 p-1.5">
            <CheckCircle className="h-4 w-4 text-status-delivered" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-delivered font-tabular">
            {estatisticas.contas_recebidas}
          </div>
          <p className="text-xs text-muted-foreground font-tabular">
            {formatCurrency(estatisticas.valor_total_recebido)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};