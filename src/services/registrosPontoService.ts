import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

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
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('registros_ponto')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('data_registro', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  },
};
