import { supabase } from '@/integrations/supabase/client';
import { Setor } from '@/types/setor';

export const setorService = {
  async fetchSetores(): Promise<Setor[]> {
    const { data, error } = await supabase
      .from('setores_empresa')
      .select('*')
      .eq('ativo', true)
      .order('descricao');

    if (error) {
      console.error('Erro ao carregar setores:', error);
      throw new Error('Não foi possível carregar os setores.');
    }

    return data?.map(item => ({
      id: item.id,
      codigo: item.codigo,
      descricao: item.descricao,
      ativo: item.ativo,
      created_at: item.created_at ? new Date(item.created_at) : undefined,
      updated_at: item.updated_at ? new Date(item.updated_at) : undefined
    })) || [];
  },

  async createSetor(setorData: Omit<Setor, 'id' | 'created_at' | 'updated_at'>): Promise<Setor> {
    const { data, error } = await supabase
      .from('setores_empresa')
      .insert({
        codigo: setorData.codigo,
        descricao: setorData.descricao,
        ativo: setorData.ativo !== false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar setor:', error);
      throw error;
    }

    return {
      id: data.id,
      codigo: data.codigo,
      descricao: data.descricao,
      ativo: data.ativo,
      created_at: new Date(data.created_at),
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }
};