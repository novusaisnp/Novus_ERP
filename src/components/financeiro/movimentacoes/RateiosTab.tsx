import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Plus, Building, DollarSign } from 'lucide-react';
import { useRateiosTitulo } from '@/hooks/useMovimentacoesCompletas';
import { TituloFinanceiro } from '@/types/movimentacoesFinanceiras';
import { currencyUtils } from '@/utils/currencyUtils';

interface RateiosTabProps {
  titulo: TituloFinanceiro;
  podeEditar: boolean;
}

export const RateiosTab = ({ titulo, podeEditar }: RateiosTabProps) => {
  const { data: rateios = [], isLoading, error } = useRateiosTitulo(titulo.id, titulo.tipo);
  const [showForm, setShowForm] = useState(false);

  console.log('[RateiosTab] Renderizando aba de rateios para título:', titulo.id, 'tipo:', titulo.tipo);
  console.log('[RateiosTab] Dados recebidos - rateios:', rateios, 'isLoading:', isLoading, 'error:', error);
  console.log('[RateiosTab] Total rateios encontrados:', rateios?.length || 0);

  // Somar em ponto flutuante deixa resíduo (0,1 + 0,2 = 0,30000000000000004), que na tela
  // aparece como "R$ -0,00". Arredondar a soma resolve na exibição, único uso aqui.
  const emCentavos = (v: number) => Math.round(v * 100) / 100;

  const totalRateado = emCentavos(
    rateios.reduce((acc, rateio) => acc + Number(rateio.valor || 0), 0),
  );
  const percentualRateado = titulo.valor_original > 0 ? (totalRateado / titulo.valor_original) * 100 : 0;
  const valorRestante = emCentavos(titulo.valor_original - totalRateado);

  // Dados para o gráfico de pizza
  const dadosGrafico = rateios.map((rateio, index) => ({
    name: rateio.plano_conta?.nome || 'Sem rubrica',
    value: Number(rateio.valor || 0),
    color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
  }));

  const renderTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border rounded-lg p-2 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {currencyUtils.formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-muted-foreground">Carregando rateios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('[RateiosTab] Erro ao carregar rateios:', error);
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-destructive">Erro ao carregar rateios: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-4">
        {/* Cabeçalho com estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currencyUtils.formatCurrency(titulo.valor_original)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Valor Rateado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-status-delivered">
                {currencyUtils.formatCurrency(totalRateado)}
              </div>
              <Progress value={percentualRateado} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {percentualRateado.toFixed(1)}% do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Valor Restante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${valorRestante > 0 ? 'text-status-production' : 'text-status-delivered'}`}>
                {currencyUtils.formatCurrency(Math.abs(valorRestante))}
              </div>
              {valorRestante !== 0 && (
                <Badge variant={valorRestante > 0 ? 'destructive' : 'secondary'} className="mt-2">
                  {valorRestante > 0 ? 'Falta ratear' : 'Valor excedente'}
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {rateios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Building className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum rateio encontrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Este título ainda não possui rateios por centro de custo ou plano de contas.
              </p>
              <p className="text-xs text-muted-foreground">
                Debug: {rateios.length} rateios carregados
              </p>
              {podeEditar && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Rateio
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Lista de rateios */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rateio contábil por rubrica</CardTitle>
                {podeEditar && (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  <div className="space-y-3">
                    {rateios.map((rateio, index) => (
                      <div key={rateio.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: dadosGrafico[index]?.color || '#gray' }}
                            />
                            <h4 className="font-medium text-sm">
                              {rateio.plano_conta?.codigo} - {rateio.plano_conta?.nome}
                            </h4>
                          </div>
                          
                          {rateio.centro_custo && (
                            <p className="text-xs text-muted-foreground mb-2 ml-5">
                              Centro de Custo: {rateio.centro_custo.codigo} - {rateio.centro_custo.nome}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-3 ml-5">
                            <span className="font-semibold text-sm">
                              {currencyUtils.formatCurrency(rateio.valor)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {((rateio.valor / titulo.valor_original) * 100).toFixed(1)}%
                            </Badge>
                          </div>
                          
                          {rateio.descricao && (
                            <p className="text-xs text-muted-foreground mt-2 ml-5 max-h-8 overflow-hidden">
                              {rateio.descricao}
                            </p>
                          )}
                        </div>
                        
                        {podeEditar && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Gráfico de distribuição */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por rubrica</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {dadosGrafico.length > 0 ? (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={dadosGrafico}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {dadosGrafico.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={renderTooltip} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={60}
                          wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                          formatter={(value, entry) => (
                            <span style={{ color: entry.color, fontSize: '11px' }}>
                              {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    <div className="text-center">
                      <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum dado para exibir</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Validações */}
        {rateios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Validações do rateio contábil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Soma dos rateios:</span>
                  <span className="font-medium">
                    {currencyUtils.formatCurrency(totalRateado)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valor original do título:</span>
                  <span className="font-medium">
                    {currencyUtils.formatCurrency(titulo.valor_original)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Diferença:</span>
                  <span className={valorRestante === 0 ? 'text-status-delivered' : 'text-status-cancelled'}>
                    {currencyUtils.formatCurrency(valorRestante)}
                  </span>
                </div>
                {valorRestante !== 0 && (
                  <p className="text-sm text-muted-foreground">
                    {valorRestante > 0 
                      ? 'Ainda há valor a ser rateado'
                      : 'A soma dos rateios excede o valor do título'
                    }
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TODO: Modal de formulário para adicionar/editar rateios */}
        {showForm && (
          <div className="text-center p-4 border border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Modal de formulário de rateio será implementado
            </p>
            <Button variant="outline" className="mt-2" onClick={() => setShowForm(false)}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};