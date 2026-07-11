
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Calculator, AlertCircle, Percent, Pencil, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import { RateioContaPagar } from '@/types/contasPagar';
import { useToast } from '@/hooks/use-toast';
import { ContaContabilAutocomplete } from './ContaContabilAutocomplete';
import { cn } from '@/lib/utils';

interface RateioManagerProps {
  valorTotal: number;
  rateios: RateioContaPagar[];
  onRateiosChange: (rateios: RateioContaPagar[]) => void;
  tipo?: 'RECEITA' | 'DESPESA';
}

export const RateioManager = ({ valorTotal, rateios, onRateiosChange, tipo = 'DESPESA' }: RateioManagerProps) => {
  console.log('[RateioContas] Inicializando RateioManager com valor total:', valorTotal);
  
  const { centrosCusto, isLoading: isLoadingCentros, error: errorCentros } = useCentrosCusto();
  const { toast } = useToast();
  
  const [rateiosLocal, setRateiosLocal] = useState<RateioContaPagar[]>(rateios);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Índices já pré-registrados (commitados no estado local do manager)
  const [preRegistrados, setPreRegistrados] = useState<Set<number>>(
    () => new Set(rateios.map((_, i) => i)),
  );
  // Serialização do último payload emitido/recebido para evitar loops de sync
  const lastSyncedRef = useRef<string>(JSON.stringify(rateios));

  console.log('[RateioContas] Centros de custo disponíveis:', centrosCusto.length);

  // Função para arredondar percentual para 2 casas decimais
  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  // Sincroniza com props somente quando o pai realmente enviou algo diferente
  // do que este componente propagou (evita reset ao clicar em outro card).
  useEffect(() => {
    const incoming = JSON.stringify(rateios);
    if (incoming !== lastSyncedRef.current) {
      console.log('[RateioContas] Sync externo detectado, atualizando local');
      setRateiosLocal(rateios);
      setPreRegistrados(new Set(rateios.map((_, i) => i)));
      lastSyncedRef.current = incoming;
    }
  }, [rateios]);

  // Propaga alterações para o pai de forma explícita (sem useEffect encadeado)
  const propagate = (novos: RateioContaPagar[]) => {
    lastSyncedRef.current = JSON.stringify(novos);
    onRateiosChange(novos);
  };

  // Tratar erros de carregamento
  useEffect(() => {
    if (errorCentros) {
      console.error('[RateioContas] Erro ao carregar centros de custo:', errorCentros);
      toast({
        title: "Erro ao carregar dados", 
        description: "Não foi possível carregar os centros de custo",
        variant: "destructive",
      });
    }
  }, [errorCentros, toast]);

  const adicionarRateio = () => {
    console.log('[RateioContas] Adicionando novo rateio');

    const novoRateio: RateioContaPagar = {
      plano_conta_id: '',
      centro_custo_id: '',
      valor: 0,
      percentual: 0,
      descricao: '',
    };
    const novos = [...rateiosLocal, novoRateio];
    setRateiosLocal(novos);
    setExpandedIndex(novos.length - 1);
    // Novo rateio ainda NÃO está pré-registrado: só ao clicar "Pré-registrar".
    // Não propaga ao pai ainda para manter a lista consistente.
  };

  const removerRateio = (index: number) => {
    console.log('[RateioContas] Removendo rateio no índice:', index);
    const novosRateios = rateiosLocal.filter((_, i) => i !== index);
    setRateiosLocal(novosRateios);
    setExpandedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
    // Reindexa pré-registrados removendo o índice e deslocando os posteriores
    setPreRegistrados((prev) => {
      const next = new Set<number>();
      prev.forEach((i) => {
        if (i === index) return;
        next.add(i > index ? i - 1 : i);
      });
      return next;
    });
    // Propaga somente os já pré-registrados
    const preservados = novosRateios.filter((_, i) => {
      const origIdx = i < index ? i : i + 1;
      return preRegistrados.has(origIdx) && origIdx !== index;
    });
    propagate(preservados);
  };

  const atualizarRateio = (index: number, campo: keyof RateioContaPagar, valor: any) => {
    console.log('[RateioContas] Atualizando rateio', index, campo, valor);

    const novosRateios = [...rateiosLocal];
    novosRateios[index] = { ...novosRateios[index], [campo]: valor };

    // Validações e cálculos automáticos
    if (campo === 'valor') {
      const valorNumerico = parseFloat(valor) || 0;
      if (valorNumerico < 0) {
        toast({
          title: "Valor inválido",
          description: "O valor não pode ser negativo",
          variant: "destructive",
        });
        return;
      }
      novosRateios[index].valor = valorNumerico;
      if (valorTotal > 0) {
        const percentualCalculado = (valorNumerico / valorTotal) * 100;
        novosRateios[index].percentual = roundToTwoDecimals(percentualCalculado);
      }
    }

    if (campo === 'percentual') {
      const percentualNumerico = parseFloat(valor) || 0;
      if (percentualNumerico < 0 || percentualNumerico > 100) {
        toast({
          title: "Percentual inválido",
          description: "O percentual deve estar entre 0% e 100%",
          variant: "destructive",
        });
        return;
      }
      const percentualArredondado = roundToTwoDecimals(percentualNumerico);
      novosRateios[index].percentual = percentualArredondado;
      if (valorTotal > 0) {
        const valorCalculado = (valorTotal * percentualArredondado) / 100;
        novosRateios[index].valor = roundToTwoDecimals(valorCalculado);
      }
    }

    setRateiosLocal(novosRateios);
    // Alteração torna o rateio "sujo": remove flag de pré-registrado
    if (preRegistrados.has(index)) {
      setPreRegistrados((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
    // Não propaga durante edição — só ao pré-registrar
  };

  const preRegistrarRateio = (index: number) => {
    console.log('[RateioContas] Pré-registrando rateio no índice:', index);
    const rateio = rateiosLocal[index];
    if (!rateio) return;

    if (!rateio.plano_conta_id) {
      toast({
        title: 'Plano de contas obrigatório',
        description: 'Selecione a conta contábil antes de pré-registrar.',
        variant: 'destructive',
      });
      return;
    }
    if (!rateio.valor || rateio.valor <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor maior que zero antes de pré-registrar.',
        variant: 'destructive',
      });
      return;
    }

    const novosPre = new Set(preRegistrados);
    novosPre.add(index);
    setPreRegistrados(novosPre);
    setExpandedIndex(null);

    // Propaga somente os rateios pré-registrados
    const preservados = rateiosLocal.filter((_, i) => novosPre.has(i));
    propagate(preservados);

    toast({
      title: 'Rateio pré-registrado',
      description: 'Clique em Atualizar/Criar para salvar definitivamente.',
    });
  };

  const distribuirIgualmente = () => {
    console.log('[RateioContas] Distribuindo valores igualmente');

    if (rateiosLocal.length === 0 || valorTotal === 0) {
      toast({
        title: "Não é possível distribuir",
        description: "Adicione pelo menos um rateio e defina um valor total",
        variant: "destructive",
      });
      return;
    }

    const valorPorRateio = roundToTwoDecimals(valorTotal / rateiosLocal.length);
    const percentualPorRateio = roundToTwoDecimals(100 / rateiosLocal.length);

    const novosRateios = rateiosLocal.map((rateio, index) => {
      if (index === rateiosLocal.length - 1) {
        const valorRestante = valorTotal - (valorPorRateio * (rateiosLocal.length - 1));
        const percentualRestante = 100 - (percentualPorRateio * (rateiosLocal.length - 1));
        return {
          ...rateio,
          valor: roundToTwoDecimals(valorRestante),
          percentual: roundToTwoDecimals(percentualRestante),
        };
      }
      return {
        ...rateio,
        valor: valorPorRateio,
        percentual: percentualPorRateio,
      };
    });

    setRateiosLocal(novosRateios);
    // "Distribuir Igualmente" só recalcula valores dos já existentes; mantém
    // o status de pré-registro como estava. Não propaga automaticamente —
    // o usuário deve confirmar via Pré-registrar em cada card ou já é pré.
    // Para consistência, propagamos os que continuam pré-registrados.
    const preservados = novosRateios.filter((_, i) => preRegistrados.has(i));
    propagate(preservados);
  };

  const valorTotalRateios = rateiosLocal.reduce((total, rateio) => total + (rateio.valor || 0), 0);
  const percentualTotalRateios = rateiosLocal.reduce((total, rateio) => total + (rateio.percentual || 0), 0);
  const diferenca = valorTotal - valorTotalRateios;
  const percentualRestante = 100 - percentualTotalRateios;

  const getCentroCustoNome = (centroId: string) => {
    const centro = centrosCusto.find(c => c.id === centroId);
    return centro ? `${centro.codigo ? centro.codigo + ' - ' : ''}${centro.nome}` : '';
  };

  // Loading state
  if (isLoadingCentros) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (errorCentros) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Erro ao carregar dados necessários para o rateio</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Rateio por Plano de Contas</h3>
          <p className="text-sm text-muted-foreground">
            Distribua o valor total entre diferentes contas contábeis analíticas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={distribuirIgualmente}
            disabled={rateiosLocal.length === 0}
            className="w-full sm:w-auto"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Distribuir Igualmente
          </Button>
          <Button 
            type="button" 
            onClick={adicionarRateio} 
            size="sm"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Rateio
          </Button>
        </div>
      </div>

      {/* Resumo Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Valor Total</span>
            <Badge variant="secondary" className="text-sm">
              R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
        </Card>
        
        <Card className="p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Rateado</span>
            <Badge variant={Math.abs(diferenca) < 0.01 ? "default" : "destructive"} className="text-sm">
              R$ {valorTotalRateios.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Percentual</span>
            <Badge variant={Math.abs(percentualTotalRateios - 100) < 0.01 ? "default" : "destructive"} className="text-sm">
              {percentualTotalRateios.toFixed(2)}%
            </Badge>
          </div>
        </Card>
      </div>

      {/* Indicador de Percentual Restante */}
      {Math.abs(percentualRestante) > 0.01 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  {percentualRestante > 0 ? 'Falta ratear:' : 'Excesso no rateio:'}
                </p>
                <p className="text-lg font-bold text-orange-900">
                  {Math.abs(percentualRestante).toFixed(2)}% de 100%
                </p>
                {Math.abs(diferenca) >= 0.01 && (
                  <p className="text-sm text-orange-700">
                    Valor: R$ {Math.abs(diferenca).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rateiosLocal.map((rateio, index) => {
          const isExpanded = expandedIndex === index;
          const preenchido = !!rateio.plano_conta_id && (rateio.valor || 0) > 0;

          return (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    className="flex-1 text-left flex items-center gap-2 hover:opacity-80 transition-opacity"
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 transition-transform',
                        isExpanded ? 'rotate-0' : '-rotate-90',
                      )}
                    />
                    <h4 className="font-medium">Rateio {index + 1}</h4>
                    {!isExpanded && preenchido && (
                      <span className="text-sm text-muted-foreground truncate">
                        · R$ {(rateio.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({(rateio.percentual || 0).toFixed(2)}%)
                        {rateio.centro_custo_id && ` · ${getCentroCustoNome(rateio.centro_custo_id)}`}
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isExpanded && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(index)}
                        aria-label="Editar rateio"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerRateio(index)}
                      className="text-destructive hover:text-destructive"
                      aria-label="Remover rateio"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <ContaContabilAutocomplete
                          label="Conta Contábil"
                          placeholder="Selecione uma conta analítica"
                          value={rateio.plano_conta_id}
                          onChange={(value) => atualizarRateio(index, 'plano_conta_id', value)}
                          required
                          tipo={tipo}
                        />
                      </div>

                      <div>
                        <Label>Centro de Custo</Label>
                        <Select
                          value={rateio.centro_custo_id || 'sem-centro'}
                          onValueChange={(value) => {
                            if (value === 'sem-centro') {
                              atualizarRateio(index, 'centro_custo_id', '');
                            } else {
                              atualizarRateio(index, 'centro_custo_id', value);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar centro de custo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem-centro">Nenhum</SelectItem>
                            {centrosCusto.filter(c => c.ativo).map((centro) => (
                              <SelectItem key={centro.id} value={centro.id}>
                                {centro.codigo ? `${centro.codigo} - ` : ''}{centro.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Valor (R$)</Label>
                        <CurrencyInput
                          value={Number(rateio.valor) || 0}
                          onValueChange={(v) => atualizarRateio(index, 'valor', String(v))}
                          placeholder="R$ 0,00"
                        />
                      </div>

                      <div>
                        <Label>Percentual (%)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={rateio.percentual || ''}
                          onChange={(e) => atualizarRateio(index, 'percentual', e.target.value)}
                          placeholder="0,00"
                        />
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <Label>Descrição</Label>
                        <Input
                          value={rateio.descricao || ''}
                          onChange={(e) => atualizarRateio(index, 'descricao', e.target.value)}
                          placeholder="Descrição do rateio (opcional)"
                        />
                      </div>
                    </div>

                    {rateio.plano_conta_id && (
                      <div className="mt-3 p-2 bg-muted rounded text-sm">
                        <strong>Resumo:</strong> Conta selecionada
                        {rateio.centro_custo_id && ` | ${getCentroCustoNome(rateio.centro_custo_id)}`}
                        {` | R$ ${(rateio.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${(rateio.percentual || 0).toFixed(2)}%)`}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>


      {rateiosLocal.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              Nenhum rateio configurado
            </h3>
            <p className="text-muted-foreground mb-4">
              Adicione rateios para distribuir o valor entre diferentes contas contábeis analíticas
            </p>
            <Button onClick={adicionarRateio}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Rateio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
