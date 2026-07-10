import { useQuery, useQueryClient } from '@tanstack/react-query';
import { consultarCNPJ } from '@/services/cnpjApi';
import type { CNPJData } from '@/types/empresa';

const STALE_MS = 10 * 60 * 1000; // 10 min
const GC_MS = 30 * 60 * 1000;    // 30 min

const clean = (v: string) => (v || '').replace(/\D/g, '');
const isValidLen = (v: string) => clean(v).length === 14;

/**
 * Hook reativo: dispara a consulta apenas quando `cnpj` tem 14 dígitos.
 * Uso: const { data, isFetching } = useCnpjLookup(cnpj);
 */
export function useCnpjLookup(cnpj: string) {
  const c = clean(cnpj);
  return useQuery<CNPJData | null>({
    queryKey: ['cnpj', c],
    queryFn: () => consultarCNPJ(c),
    enabled: isValidLen(cnpj),
    staleTime: STALE_MS,
    gcTime: GC_MS,
    retry: 1,
  });
}

/**
 * Versão imperativa para handlers existentes: reaproveita o cache do QueryClient
 * (dedup + persistência entre modais) sem exigir refatoração do form.
 * Uso:
 *   const lookup = useCnpjLookupImperative();
 *   const data = await lookup(cnpj);
 */
export function useCnpjLookupImperative() {
  const qc = useQueryClient();
  return (cnpj: string) => {
    const c = clean(cnpj);
    if (c.length !== 14) return Promise.resolve(null);
    return qc.fetchQuery<CNPJData | null>({
      queryKey: ['cnpj', c],
      queryFn: () => consultarCNPJ(c),
      staleTime: STALE_MS,
      gcTime: GC_MS,
    });
  };
}
