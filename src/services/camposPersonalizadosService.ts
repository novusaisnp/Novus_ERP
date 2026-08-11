import { supabase } from '@/integrations/supabase/client';
import type { CampoPersonalizado, CampoPersonalizadoInput } from '@/types/campoPersonalizado';

const TABLE = 'campos_personalizados';

export const camposPersonalizadosService = {
  async listar(empresaId: string, somenteAtivos = false): Promise<CampoPersonalizado[]> {
    let query = supabase
      .from(TABLE)
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .eq('entidade', 'entidades')
      .order('ordem')
      .order('rotulo');

    if (somenteAtivos) query = query.eq('ativo', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CampoPersonalizado[];
  },

  async criar(input: CampoPersonalizadoInput): Promise<CampoPersonalizado> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ ...input, entidade: 'entidades' })
      .select()
      .single();
    if (error) throw error;
    return data as CampoPersonalizado;
  },

  async atualizar(
    id: string,
    empresaId: string,
    patch: Partial<Omit<CampoPersonalizadoInput, 'empresa_representada_id' | 'chave' | 'entidade'>>,
  ): Promise<CampoPersonalizado> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();
    if (error) throw error;
    return data as CampoPersonalizado;
  },
};
