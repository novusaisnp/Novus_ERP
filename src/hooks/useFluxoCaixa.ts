import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FluxoCaixaService } from '@/services/fluxoCaixaService';
import { 
  FluxoCaixaItem, 
  FluxoCaixaFiltros, 
  FluxoCaixaResumo, 
  FluxoCaixaProjecao,
  FluxoCaixaEstatisticas
} from '@/types/fluxoCaixa';

export const useFluxoCaixa = (filtros: FluxoCaixaFiltros = {}) => {
  console.log('[FluxoCaixa] Hook iniciado com filtros:', filtros);

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

  // Query para buscar estatísticas
  const { 
    data: estatisticas, 
    isLoading: isLoadingEstatisticas, 
    error: errorEstatisticas 
  } = useQuery({
    queryKey: ['fluxo-caixa-estatisticas', filtros],
    queryFn: () => FluxoCaixaService.getEstatisticasAvancadas(filtros),
    staleTime: 10 * 60 * 1000,
    retry: 2
  });

  // Preparar dados para o gráfico
  const dadosGrafico = useMemo(() => {
    if (!movimentacoes.length) return [];

    const dadosPorData = new Map<string, { entradas: number; saidas: number }>();
    
    movimentacoes.forEach(m => {
      const data = m.data.split('T')[0];
      if (!dadosPorData.has(data)) {
        dadosPorData.set(data, { entradas: 0, saidas: 0 });
      }
      
      const dadosDia = dadosPorData.get(data)!;
      if (m.tipo === 'ENTRADA') {
        dadosDia.entradas += m.valor;
      } else {
        dadosDia.saidas += m.valor;
      }
    });

    let saldoAcumulado = 0;
    
    return Array.from(dadosPorData.entries())
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
  }, [movimentacoes]);

  // Estados consolidados
  const isLoading = isLoadingMovimentacoes || isLoadingResumo || isLoadingProjecao || isLoadingEstatisticas;
  const error = errorMovimentacoes || errorResumo || errorProjecao || errorEstatisticas;

  // Função para invalidar cache
  const invalidateCache = () => {
    console.log('[FluxoCaixa] Invalidando cache');
    refetchMovimentacoes();
  };

  // Log de debug
  useEffect(() => {
    console.log('[FluxoCaixa] Dados atualizados:', {
      movimentacoes: movimentacoes.length,
      resumo: !!resumo,
      projecao: projecao.length,
      estatisticas: !!estatisticas,
      isLoading,
      error
    });
  }, [movimentacoes, resumo, projecao, estatisticas, isLoading, error]);

  return {
    // Dados
    movimentacoes,
    resumo,
    projecao,
    estatisticas,
    dadosGrafico,
    
    // Estados
    isLoading,
    error,
    
    // Ações
    invalidateCache,
    refetchMovimentacoes
  };
};

export default useFluxoCaixa;