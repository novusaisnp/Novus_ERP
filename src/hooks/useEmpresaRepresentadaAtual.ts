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
      if (!rpcError && empresaId) {
        const { data, error } = await supabase
          .from('empresas_representadas')
          .select('id, nome, cnpj, configuracoes')
          .eq('id', empresaId)
          .maybeSingle();
        if (error) throw error;
        return data as EmpresaRepresentadaAtual | null;
      }

      // Admin sem vínculo direto (get_user_empresa_id nulo): se há só uma empresa
      // representada cadastrada, não há ambiguidade — usa ela. Com mais de uma,
      // não há "empresa atual" determinável, cai no fallback do chamador.
      const { data: todas, error: listError } = await supabase
        .from('empresas_representadas')
        .select('id, nome, cnpj, configuracoes')
        .eq('ativo', true);
      if (listError) throw listError;
      return todas?.length === 1 ? (todas[0] as EmpresaRepresentadaAtual) : null;
    },
    staleTime: 5 * 60_000,
  });
};
