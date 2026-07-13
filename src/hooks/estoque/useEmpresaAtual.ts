// P12: Hook para obter empresa atual do usuário
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEmpresaAtual() {
  return useQuery({
    queryKey: ['user-empresa-atual'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_empresa_id');
      if (error) throw error;
      return data as string | null;
    },
    staleTime: 5 * 60_000,
  });
}
