import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FiscalStatusPorVenda {
  venda_id: string;
  documento_id: string;
  status: string;
  updated_at: string;
}

/**
 * Retorna o status fiscal mais recente para cada venda_id passado.
 * Usa a RPC `get_ultimo_documento_por_venda` (single round-trip, sem N+1).
 */
export const useFiscalStatusPorVenda = (vendaIds: string[]) => {
  const key = [...new Set(vendaIds)].sort();
  return useQuery<Record<string, FiscalStatusPorVenda>>({
    queryKey: ['fiscal-status-por-venda', key],
    enabled: key.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_ultimo_documento_por_venda', {
        venda_ids: key,
      });
      if (error) throw error;
      const map: Record<string, FiscalStatusPorVenda> = {};
      for (const row of (data ?? []) as FiscalStatusPorVenda[]) {
        if (row.venda_id) map[row.venda_id] = row;
      }
      return map;
    },
  });
};
