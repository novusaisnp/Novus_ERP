import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ArrowDown, ArrowUp, Landmark, AlertCircle, TrendingUp } from 'lucide-react';
import { dashboardService } from '@/services/dashboardService';

const brl = (v: number) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface MetricProps {
  title: string;
  icon: React.ElementType;
  value: string;
  loading: boolean;
  subtitle?: string;
  valueClassName?: string;
}

const MetricCard: React.FC<MetricProps> = ({ title, icon: Icon, value, loading, subtitle, valueClassName }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="rounded-md p-1.5 bg-[hsl(var(--accent-vivid-soft))]">
        <Icon className="h-4 w-4 text-[hsl(var(--accent-vivid))]" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
      )}
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const clientes = useQuery({ queryKey: ['dash-clientes'], queryFn: dashboardService.fetchClientesAtivos });
  const pagar = useQuery({ queryKey: ['dash-pagar'], queryFn: () => dashboardService.fetchSumContas('contas_pagar') });
  const receber = useQuery({ queryKey: ['dash-receber'], queryFn: () => dashboardService.fetchSumContas('contas_receber') });
  const saldo = useQuery({ queryKey: ['dash-saldo'], queryFn: dashboardService.fetchSaldoBancario });

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Clientes Ativos"
          icon={Users}
          loading={clientes.isLoading}
          value={String(clientes.data ?? 0)}
        />
        <MetricCard
          title="Contas a Pagar"
          icon={ArrowDown}
          loading={pagar.isLoading}
          value={brl(pagar.data ?? 0)}
          subtitle="Pendentes"
          valueClassName="text-[hsl(var(--status-production))]"
        />
        <MetricCard
          title="Contas a Receber"
          icon={ArrowUp}
          loading={receber.isLoading}
          value={brl(receber.data ?? 0)}
          subtitle="Pendentes"
          valueClassName="text-[hsl(var(--status-delivered))]"
        />
        <MetricCard
          title="Saldo Bancário"
          icon={Landmark}
          loading={saldo.isLoading}
          value={brl(saldo.data ?? 0)}
          subtitle="Contas ativas"
          valueClassName={(saldo.data ?? 0) >= 0 ? 'text-[hsl(var(--status-delivered))]' : 'text-[hsl(var(--status-cancelled))]'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[hsl(var(--status-production))]" />
              Alertas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-[hsl(var(--status-production))] pl-4">
              <p className="font-medium">Estoque Baixo</p>
              <p className="text-sm text-muted-foreground">Monitore produtos abaixo do mínimo</p>
            </div>
            <div className="border-l-4 border-[hsl(var(--status-cancelled))] pl-4">
              <p className="font-medium">Contas Vencidas</p>
              <p className="text-sm text-muted-foreground">Acompanhe contas em atraso</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[hsl(var(--status-delivered))]" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Contas a Receber</span>
              <span className="text-sm font-bold text-[hsl(var(--status-delivered))]">{brl(receber.data ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Contas a Pagar</span>
              <span className="text-sm font-bold text-[hsl(var(--status-cancelled))]">{brl(pagar.data ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Saldo Projetado</span>
              <span className="font-bold text-primary">
                {brl((saldo.data ?? 0) + (receber.data ?? 0) - (pagar.data ?? 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
