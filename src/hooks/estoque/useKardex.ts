// P14.1: Hook Kardex por produto (com paginação server-side)
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchKardex, type KardexParams, type KardexResult } from '@/services/estoque/relatoriosService';

export function useKardex(params: KardexParams | null) {
  return useQuery<KardexResult>({
    queryKey: ['kardex', params],
    enabled: !!params && !!params.empresaId && !!params.produtoId,
    queryFn: () => fetchKardex(params as KardexParams),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
