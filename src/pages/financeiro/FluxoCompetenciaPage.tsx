import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LinhaRelatorio {
  ano_mes: string;
  receita_prevista: number;
  receita_realizada: number;
  despesa_prevista: number;
  despesa_realizada: number;
  saldo_competencia: number;
}

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function FluxoCompetenciaPage() {
  const hoje = new Date();
  const [dataIni, setDataIni] = useState<string>(
    format(startOfMonth(subMonths(hoje, 11)), 'yyyy-MM-dd'),
  );
  const [dataFim, setDataFim] = useState<string>(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  const { data, isLoading, error, refetch } = useQuery<LinhaRelatorio[]>({
    queryKey: ['fluxo-competencia', dataIni, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('relatorio_fluxo_competencia' as never, {
        p_data_ini: dataIni,
        p_data_fim: dataFim,
        p_empresa_id: null,
      });
      if (error) throw error;
      return (data as LinhaRelatorio[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    let acumulado = 0;
    return data.map((l) => {
      acumulado += Number(l.saldo_competencia) || 0;
      return {
        mes: format(new Date(l.ano_mes), 'MMM/yy', { locale: ptBR }),
        Receita: Number(l.receita_realizada) || 0,
        Despesa: Number(l.despesa_realizada) || 0,
        Saldo: Number(l.saldo_competencia) || 0,
        Acumulado: acumulado,
      };
    });
  }, [data]);

  const totais = useMemo(() => {
    if (!data) return { receita: 0, despesa: 0, saldo: 0 };
    return data.reduce(
      (acc, l) => ({
        receita: acc.receita + (Number(l.receita_realizada) || 0),
        despesa: acc.despesa + (Number(l.despesa_realizada) || 0),
        saldo: acc.saldo + (Number(l.saldo_competencia) || 0),
      }),
      { receita: 0, despesa: 0, saldo: 0 },
    );
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fluxo por Competência</h1>
          <p className="text-sm text-muted-foreground">
            Receita reconhecida vs despesa incorrida por mês de competência contábil.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="data-ini">Data inicial</Label>
            <Input id="data-ini" type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="data-fim">Data final</Label>
            <Input id="data-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => refetch()} disabled={isLoading}>
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Receita realizada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{brl(totais.receita)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Despesa incorrida</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{brl(totais.despesa)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Saldo de competência</CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${totais.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}
            >
              {brl(totais.saldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receita vs Despesa (por mês de competência)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : error ? (
            <p className="text-destructive text-sm">Erro ao carregar dados.</p>
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhum título com data de competência no período selecionado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => brl(v).replace('R$', '').trim()}
                />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Bar dataKey="Receita" fill="hsl(var(--primary))" />
                <Bar dataKey="Despesa" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saldo acumulado</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {isLoading ? (
            <Skeleton className="w-full h-full" />
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis
                  className="text-xs"
                  tickFormatter={(v) => brl(v).replace('R$', '').trim()}
                />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Acumulado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento mensal</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="w-full h-40" />
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-left">
                    <th className="py-2 pr-4">Mês</th>
                    <th className="py-2 pr-4">Receita prevista</th>
                    <th className="py-2 pr-4">Receita realizada</th>
                    <th className="py-2 pr-4">Despesa prevista</th>
                    <th className="py-2 pr-4">Despesa realizada</th>
                    <th className="py-2 pr-4">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((l) => (
                    <tr key={l.ano_mes} className="border-b border-border/50">
                      <td className="py-2 pr-4">
                        {format(new Date(l.ano_mes), 'MMM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="py-2 pr-4">{brl(Number(l.receita_prevista))}</td>
                      <td className="py-2 pr-4 text-primary">
                        {brl(Number(l.receita_realizada))}
                      </td>
                      <td className="py-2 pr-4">{brl(Number(l.despesa_prevista))}</td>
                      <td className="py-2 pr-4 text-destructive">
                        {brl(Number(l.despesa_realizada))}
                      </td>
                      <td
                        className={`py-2 pr-4 font-medium ${
                          Number(l.saldo_competencia) >= 0 ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        {brl(Number(l.saldo_competencia))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
