import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EstatisticasMovimentacoes } from '@/types/movimentacoesBancarias';
import { TrendingUp, TrendingDown, ArrowRightLeft, CheckCircle2, XCircle } from 'lucide-react';
import { currencyUtils } from '@/utils/currencyUtils';

interface MovimentacoesBancariasStatsProps {
  estatisticas: EstatisticasMovimentacoes;
}

export function MovimentacoesBancariasStats({ estatisticas }: MovimentacoesBancariasStatsProps) {
  const {
    total_movimentacoes,
    total_depositos,
    total_saques,
    total_transferencias,
    total_ajustes,
    valor_total_entradas,
    valor_total_saidas,
    saldo_liquido,
    movimentacoes_conciliadas,
    movimentacoes_estornadas,
  } = estatisticas;

  const percentualConciliado = total_movimentacoes > 0 
    ? (movimentacoes_conciliadas / total_movimentacoes) * 100 
    : 0;

  const saldoPositivo = saldo_liquido >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {/* Total de Movimentações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total_movimentacoes}</div>
          <p className="text-xs text-muted-foreground">
            movimentações
          </p>
        </CardContent>
      </Card>

      {/* Entradas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Entradas</CardTitle>
          <TrendingUp className="h-4 w-4 text-status-delivered" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-delivered">
            {currencyUtils.formatCurrency(valor_total_entradas)}
          </div>
          <p className="text-xs text-muted-foreground">
            {total_depositos} depósitos
          </p>
        </CardContent>
      </Card>

      {/* Saídas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saídas</CardTitle>
          <TrendingDown className="h-4 w-4 text-status-cancelled" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-cancelled">
            {currencyUtils.formatCurrency(valor_total_saidas)}
          </div>
          <p className="text-xs text-muted-foreground">
            {total_saques} saques
          </p>
        </CardContent>
      </Card>

      {/* Saldo Líquido */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
          {saldoPositivo ? (
            <TrendingUp className="h-4 w-4 text-status-delivered" />
          ) : (
            <TrendingDown className="h-4 w-4 text-status-cancelled" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${saldoPositivo ? 'text-status-delivered' : 'text-status-cancelled'}`}>
            {currencyUtils.formatCurrency(saldo_liquido)}
          </div>
          <p className="text-xs text-muted-foreground">
            {saldoPositivo ? 'Positivo' : 'Negativo'}
          </p>
        </CardContent>
      </Card>

      {/* Transferências */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Transferências</CardTitle>
          <ArrowRightLeft className="h-4 w-4 text-status-confirmed" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-status-confirmed">{total_transferencias}</div>
          <p className="text-xs text-muted-foreground">
            operações
          </p>
        </CardContent>
      </Card>

      {/* Conciliação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conciliação</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-status-delivered" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">{movimentacoes_conciliadas}</div>
            <Badge variant="outline" className="text-xs">
              {percentualConciliado.toFixed(0)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            conciliadas
          </p>
        </CardContent>
      </Card>

      {/* Informações Adicionais - Segunda linha */}
      {total_ajustes > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Detalhes Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ajustes:</span>
                <span className="font-medium">{total_ajustes}</span>
              </div>
              {movimentacoes_estornadas > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estornadas:</span>
                  <Badge variant="destructive" className="text-xs">
                    {movimentacoes_estornadas}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}