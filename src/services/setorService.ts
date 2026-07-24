import { supabase } from '@/integrations/supabase/client';
import { Setor } from '@/types/setor';

export const setorService = {
  async fetchSetores(): Promise<Setor[]> {
    const { data, error } = await supabase
      .from('setores_empresa')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[RH] Erro ao carregar setores');
      throw new Error('Não foi possível carregar os setores.');
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      nome: item.nome,
      codigo: item.nome,
      descricao: item.descricao ?? undefined,
      departamento_id: item.departamento_id ?? null,
      ativo: item.ativo,
      created_at: item.created_at ? new Date(item.created_at) : undefined,
      updated_at: item.updated_at ? new Date(item.updated_at) : undefined,
    }));
  },

  async createSetor(setorData: Omit<Setor, 'id' | 'created_at' | 'updated_at'>): Promise<Setor> {
    const { data, error } = await supabase
      .from('setores_empresa')
      .insert({
        nome: setorData.nome || setorData.codigo,
        descricao: setorData.descricao ?? null,
        departamento_id: setorData.departamento_id ?? null,
        ativo: setorData.ativo !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[RH] Erro ao criar setor');
      throw error;
    }

    return {
      id: data.id,
      nome: data.nome,
      codigo: data.nome,
      descricao: data.descricao ?? undefined,
      departamento_id: data.departamento_id ?? null,
      ativo: data.ativo,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  },
};
