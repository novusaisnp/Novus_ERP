import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpresaRepresentadaAtual {
  id: string;
  nome: string;
  cnpj: string | null;
  configuracoes: Record<string, unknown> | null;
}

/**
 * Empresa representada (loja/CNPJ) do usuário logado — em cenário multiloja,
 * cada empresa_representada tem seu próprio CNPJ e sua própria logo.
 */
export const useEmpresaRepresentadaAtual = () => {
  return useQuery({
    queryKey: ['empresa-representada-atual'],
    queryFn: async (): Promise<EmpresaRepresentadaAtual | null> => {
      const { data: empresaId, error: rpcError } = await supabase.rpc('get_user_empresa_id');
      if (rpcError || !empresaId) return null;

      const { data, error } = await supabase
        .from('empresas_representadas')
        .select('id, nome, cnpj, configuracoes')
        .eq('id', empresaId)
        .maybeSingle();
      if (error) throw error;
      return data as EmpresaRepresentadaAtual | null;
    },
    staleTime: 5 * 60_000,
  });
};
