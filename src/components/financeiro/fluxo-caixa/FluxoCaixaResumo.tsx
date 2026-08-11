import { FluxoCaixaResumo as FluxoCaixaResumoType } from '@/types/fluxoCaixa';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calculator, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react';

interface FluxoCaixaResumoProps {
  resumo?: FluxoCaixaResumoType;
  isLoading: boolean;
}

export const FluxoCaixaResumo = ({ resumo, isLoading }: FluxoCaixaResumoProps) => {
  console.log('[FluxoCaixa] Renderizando resumo:', resumo);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!resumo) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dado disponível</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getVariationColor = (value: number) => {
    if (value > 0) return 'text-status-delivered';
    if (value < 0) return 'text-status-cancelled';
    return 'text-muted-foreground';
  };

  const getRunwayColor = (dias: number) => {
    if (dias < 30) return 'destructive';
    if (dias < 60) return 'secondary';
    return 'default';
  };

  const cards = [
    {
      title: 'Total de Entradas',
      value: formatCurrency(resumo.total_entradas),
      icon: TrendingUp,
      color: 'text-status-delivered',
      description: 'Receitas do período'
    },
    {
      title: 'Total de Saídas',
      value: formatCurrency(resumo.total_saidas),
      icon: TrendingDown,
      color: 'text-status-cancelled',
      description: 'Despesas do período'
    },
    {
      title: 'Saldo Atual',
      value: formatCurrency(resumo.saldo_atual),
      icon: DollarSign,
      color: getVariationColor(resumo.saldo_atual),
      description: 'Saldo real atual'
    },
    {
      title: 'Projeção 30 dias',
      value: formatCurrency(resumo.saldo_projetado_30d),
      icon: Calculator,
      color: getVariationColor(resumo.saldo_projetado_30d),
      description: 'Saldo projetado'
    },
    {
      title: 'Capital de Giro',
      value: formatCurrency(resumo.capital_giro),
      icon: DollarSign,
      color: getVariationColor(resumo.capital_giro),
      description: 'Saldos bancários + movimentos'
    },
    {
      title: 'Runway',
      value: `${resumo.runway_dias} dias`,
      icon: Calendar,
      color: resumo.runway_dias < 30 ? 'text-status-cancelled' : 'text-status-delivered',
      description: 'Dias até esgotamento',
      badge: resumo.runway_dias < 30 ? 'Crítico' : 
             resumo.runway_dias < 60 ? 'Atenção' : 'Saudável'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className={`rounded-md p-1.5 ${card.color.replace('text-', 'bg-')}/10`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold font-tabular ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
              {card.badge && (
                <Badge 
                  variant={getRunwayColor(resumo.runway_dias)}
                  className="mt-2"
                >
                  {card.badge}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projeções adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Projeções de Saldo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">7 dias</div>
              <div className={`text-lg font-semibold ${getVariationColor(resumo.saldo_projetado_7d)}`}>
                {formatCurrency(resumo.saldo_projetado_7d)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">14 dias</div>
              <div className={`text-lg font-semibold ${getVariationColor(resumo.saldo_projetado_14d)}`}>
                {formatCurrency(resumo.saldo_projetado_14d)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">30 dias</div>
              <div className={`text-lg font-semibold ${getVariationColor(resumo.saldo_projetado_30d)}`}>
                {formatCurrency(resumo.saldo_projetado_30d)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(resumo.saldo_atual < resumo.saldo_minimo || resumo.runway_dias < 30) && (
        <Card className="border-status-cancelled/30 bg-status-cancelled/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-status-cancelled">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-sm">
                {resumo.saldo_atual < resumo.saldo_minimo && (
                  <p>Saldo atual abaixo do mínimo recomendado ({formatCurrency(resumo.saldo_minimo)})</p>
                )}
                {resumo.runway_dias < 30 && (
                  <p>Runway crítico: apenas {resumo.runway_dias} dias restantes</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FluxoCaixaResumo;