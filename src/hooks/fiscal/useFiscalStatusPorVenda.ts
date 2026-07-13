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
 * Uma única query cobre a página inteira (evita N+1).
 */
export const useFiscalStatusPorVenda = (vendaIds: string[]) => {
  const key = [...new Set(vendaIds)].sort();
  return useQuery<Record<string, FiscalStatusPorVenda>>({
    queryKey: ['fiscal-status-por-venda', key],
    enabled: key.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_documentos_eletronicos')
        .select('id, venda_id, status, updated_at')
        .in('venda_id', key)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const map: Record<string, FiscalStatusPorVenda> = {};
      for (const row of data ?? []) {
        if (!row.venda_id) continue;
        if (!map[row.venda_id]) {
          map[row.venda_id] = {
            venda_id: row.venda_id,
            documento_id: row.id,
            status: row.status,
            updated_at: row.updated_at,
          };
        }
      }
      return map;
    },
  });
};
