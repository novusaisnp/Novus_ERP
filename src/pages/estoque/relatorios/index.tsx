// P14.2: Hub de Relatórios de Estoque
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, MapPin, Timer, AlertTriangle } from 'lucide-react';

const items = [
  { to: 'giro', title: 'Giro de Estoque', icon: TrendingUp, desc: 'Rotatividade de produtos no período.' },
  { to: 'curva-abc', title: 'Curva ABC', icon: BarChart3, desc: 'Classificação Pareto por valor de saída (12m).' },
  { to: 'posicao', title: 'Posição por Localização', icon: MapPin, desc: 'Saldo pivotado por localização.' },
  { to: 'parados', title: 'Produtos Parados', icon: Timer, desc: 'Produtos sem saída há N dias.' },
  { to: 'ruptura', title: 'Ruptura de Estoque', icon: AlertTriangle, desc: 'Saldo ≤ estoque mínimo.' },
];

const RelatoriosEstoqueHub: React.FC = () => (
  <div className="container mx-auto px-6 py-8 space-y-6">
    <div>
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <BarChart3 className="h-8 w-8" /> Relatórios de Estoque
      </h1>
      <p className="text-muted-foreground">Analíticos operacionais e gerenciais.</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} className="block">
            <Card className="hover:border-primary/50 hover:shadow-md transition-all h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" /> {it.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{it.desc}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  </div>
);

export default RelatoriosEstoqueHub;
