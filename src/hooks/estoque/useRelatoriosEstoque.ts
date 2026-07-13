// P14.2: Hooks dos relatórios de estoque
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  fetchGiro, fetchCurvaAbc, fetchPosicao, fetchParados, fetchRuptura,
  type GiroRow, type CurvaAbcRow, type PosicaoRow, type ParadosRow, type RupturaRow,
} from '@/services/estoque/relatoriosService';

export function useRelatorioGiro(params: Parameters<typeof fetchGiro>[0] | null) {
  return useQuery<GiroRow[]>({
    queryKey: ['relatorio-giro', params],
    enabled: !!params?.empresaId,
    queryFn: () => fetchGiro(params as NonNullable<typeof params>),
    staleTime: 60_000,
  });
}

export function useRelatorioCurvaAbc(params: Parameters<typeof fetchCurvaAbc>[0] | null) {
  return useQuery({
    queryKey: ['relatorio-curva-abc', params],
    enabled: !!params?.empresaId,
    queryFn: () => fetchCurvaAbc(params as NonNullable<typeof params>),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useRelatorioPosicao(params: Parameters<typeof fetchPosicao>[0] | null) {
  return useQuery<PosicaoRow[]>({
    queryKey: ['relatorio-posicao', params],
    enabled: !!params?.empresaId,
    queryFn: () => fetchPosicao(params as NonNullable<typeof params>),
    staleTime: 60_000,
  });
}

export function useRelatorioParados(params: Parameters<typeof fetchParados>[0] | null) {
  return useQuery<ParadosRow[]>({
    queryKey: ['relatorio-parados', params],
    enabled: !!params?.empresaId,
    queryFn: () => fetchParados(params as NonNullable<typeof params>),
    staleTime: 60_000,
  });
}

export function useRelatorioRuptura(params: Parameters<typeof fetchRuptura>[0] | null) {
  return useQuery<RupturaRow[]>({
    queryKey: ['relatorio-ruptura', params],
    enabled: !!params?.empresaId,
    queryFn: () => fetchRuptura(params as NonNullable<typeof params>),
    staleTime: 60_000,
  });
}
