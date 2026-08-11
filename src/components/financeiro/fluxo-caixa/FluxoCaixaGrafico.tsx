import { FluxoCaixaProjecao, FluxoCaixaGraficoData } from '@/types/fluxoCaixa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FluxoCaixaGraficoProps {
  dados: FluxoCaixaGraficoData[];
  projecao: FluxoCaixaProjecao[];
  isLoading: boolean;
}

export const FluxoCaixaGrafico = ({ dados, projecao, isLoading }: FluxoCaixaGraficoProps) => {
  console.log('[FluxoCaixa] Renderizando gráfico com', dados.length, 'pontos');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (dados.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            <div className="text-center">
              <p>Nenhum dado disponível para o gráfico</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução do Fluxo de Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
                labelFormatter={(label) => `Data: ${formatDate(label)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="entradas"
                stroke="hsl(var(--status-delivered))"
                strokeWidth={2}
                name="Entradas"
                dot={{ fill: 'hsl(var(--status-delivered))', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="saidas"
                stroke="hsl(var(--status-cancelled))"
                strokeWidth={2}
                name="Saídas"
                dot={{ fill: 'hsl(var(--status-cancelled))', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="saldo_acumulado"
                stroke="hsl(var(--accent-vivid))"
                strokeWidth={3}
                name="Saldo Acumulado"
                dot={{ fill: 'hsl(var(--accent-vivid))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default FluxoCaixaGrafico;