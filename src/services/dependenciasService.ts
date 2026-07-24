import { supabase } from '@/integrations/supabase/client';
import type { CheckDependenciasResult } from '@/types/dependencias';


export const dependenciasService = {
  async check(entidade: string, id: string): Promise<CheckDependenciasResult> {
    const { data, error } = await supabase.rpc('check_dependencias', {
      p_entidade: entidade,
      p_id: id,
    });
    if (error) {
      console.error('[dependenciasService] Erro em check_dependencias:', error);
      throw error;
    }
    return data as CheckDependenciasResult;
  },
};
