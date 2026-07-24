import { supabase } from '@/integrations/supabase/client';

export interface RegistroPonto {
  id: string;
  colaborador_id: string;
  data_registro: string;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  total_horas: number | null;
  status: string | null;
}

export const registrosPontoService = {
  async listRegistros(): Promise<RegistroPonto[]> {
    const { data, error } = await supabase
      .from('registros_ponto')
      .select('*')
      .order('data_registro', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
};
