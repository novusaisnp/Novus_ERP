import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FluxoCaixaService } from '@/services/fluxoCaixaService';
import {
  FluxoCaixaItem,
  FluxoCaixaFiltros,
  FluxoCaixaResumo,
  FluxoCaixaProjecao,
  FluxoCaixaEstatisticas,
  PeriodoAgrupamento,
} from '@/types/fluxoCaixa';

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Chave do bucket no formato YYYY-MM-DD (o início do período), sempre em data
// local — "T00:00:00" evita o deslocamento de um dia em UTC-3 que já mordeu
// este projeto antes (new Date('YYYY-MM-DD') sozinho interpreta como UTC).
const bucketKey = (dataStr: string, periodo: PeriodoAgrupamento): string => {
  const d = new Date(`${dataStr}T00:00:00`);
  if (periodo === 'MENSAL') {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
  }
  if (periodo === 'SEMANAL') {
    const diaSemana = d.getDay(); // 0=domingo
    const deslocamentoParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(d);
    segunda.setDate(d.getDate() + deslocamentoParaSegunda);
    return toIso(segunda);
  }
  return dataStr;
};

export const useFluxoCaixa = (filtros: FluxoCaixaFiltros = {}) => {
  const queryClient = useQueryClient();

  // Query para buscar movimentações
  const {
    data: movimentacoes = [],
    isLoading: isLoadingMovimentacoes,
    error: errorMovimentacoes,
    refetch: refetchMovimentacoes
  } = useQuery({
    queryKey: ['fluxo-caixa', filtros],
    queryFn: () => FluxoCaixaService.getFluxoCaixa(filtros),
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2
  });

  // Query para buscar resumo
  const { 
    data: resumo, 
    isLoading: isLoadingResumo, 
    error: errorResumo 
  } = useQuery({
    queryKey: ['fluxo-caixa-resumo', filtros],
    queryFn: () => FluxoCaixaService.getResumoFluxoCaixa(filtros),
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  // Query para buscar projeção
  const { 
    data: projecao = [], 
    isLoading: isLoadingProjecao, 
    error: errorProjecao 
  } = useQuery({
    queryKey: ['fluxo-caixa-projecao', 30],
    queryFn: () => FluxoCaixaService.getProjecaoFluxoCaixa(30),
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 2
  });

  // Derivado em memória do array de `movimentacoes` já buscado acima — não é
  // mais uma query própria (AUDITORIA_NOVA Fase 5, item 3/3: eliminava um
  // re-fetch completo e redundante de contas_pagar/contas_receber).
  const estatisticas = useMemo(
    () => movimentacoes.length > 0 ? FluxoCaixaService.getEstatisticasAvancadas(movimentacoes, filtros) : undefined,
    [movimentacoes, filtros]
  );

  // Preparar dados para o gráfico, agrupados por dia/semana/mês conforme o
  // filtro escolhido (antes ignorava periodo_agrupamento e sempre agrupava
  // por dia — AUDITORIA_NOVA Fase 3).
  const periodoAgrupamento = filtros.periodo_agrupamento || 'DIARIO';
  const dadosGrafico = useMemo(() => {
    if (!movimentacoes.length) return [];

    const dadosPorBucket = new Map<string, { entradas: number; saidas: number }>();

    movimentacoes.forEach(m => {
      const chave = bucketKey(m.data.split('T')[0], periodoAgrupamento);
      if (!dadosPorBucket.has(chave)) {
        dadosPorBucket.set(chave, { entradas: 0, saidas: 0 });
      }

      const dadosBucket = dadosPorBucket.get(chave)!;
      if (m.tipo === 'ENTRADA') {
        dadosBucket.entradas += m.valor;
      } else {
        dadosBucket.saidas += m.valor;
      }
    });

    let saldoAcumulado = 0;

    return Array.from(dadosPorBucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, { entradas, saidas }]) => {
        saldoAcumulado += entradas - saidas;
        return {
          data,
          entradas,
          saidas,
          saldo_acumulado: saldoAcumulado
        };
      });
  }, [movimentacoes, periodoAgrupamento]);

  // Estados consolidados
  const isLoading = isLoadingMovimentacoes || isLoadingResumo || isLoadingProjecao;
  const error = errorMovimentacoes || errorResumo || errorProjecao;

  // "Atualizar" precisa recarregar movimentações/resumo/projeção —
  // estatísticas são derivadas de `movimentacoes`, então acompanham sozinhas.
  const invalidateCache = () => {
    queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
    queryClient.invalidateQueries({ queryKey: ['fluxo-caixa-resumo'] });
    queryClient.invalidateQueries({ queryKey: ['fluxo-caixa-projecao'] });
  };


  return {
    // Dados
    movimentacoes,
    resumo,
    projecao,
    estatisticas,
    dadosGrafico,
    periodoAgrupamento,

    // Estados
    isLoading,
    error,
    
    // Ações
    invalidateCache,
    refetchMovimentacoes
  };
};

export default useFluxoCaixa;