
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type UnidadeMedida = Tables<'unidades_medida'>;
export type UnidadeMedidaInsert = TablesInsert<'unidades_medida'>;
export type UnidadeMedidaUpdate = TablesUpdate<'unidades_medida'>;

export const unidadeMedidaService = {
  async getAll(): Promise<UnidadeMedida[]> {
    
    const { data, error } = await supabase
      .from('unidades_medida')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[UnidadeMedidaService] Erro ao buscar unidades de medida:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<UnidadeMedida | null> {
    
    const { data, error } = await supabase
      .from('unidades_medida')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[UnidadeMedidaService] Erro ao buscar unidade de medida:', error);
      throw error;
    }

    return data;
  },

  async create(unidadeMedida: UnidadeMedidaInsert): Promise<UnidadeMedida> {
    
    const { data, error } = await supabase
      .from('unidades_medida')
      .insert(unidadeMedida)
      .select()
      .single();

    if (error) {
      console.error('[UnidadeMedidaService] Erro ao criar unidade de medida:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, unidadeMedida: UnidadeMedidaUpdate): Promise<UnidadeMedida> {
    
    const { data, error } = await supabase
      .from('unidades_medida')
      .update({
        ...unidadeMedida,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[UnidadeMedidaService] Erro ao atualizar unidade de medida:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    
    const { error } = await supabase
      .from('unidades_medida')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[UnidadeMedidaService] Erro ao desativar unidade de medida:', error);
      throw error;
    }

  },
};
