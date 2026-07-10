
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Tamanho = Tables<'tamanhos_produtos'>;
export type TamanhoInsert = TablesInsert<'tamanhos_produtos'>;
export type TamanhoUpdate = TablesUpdate<'tamanhos_produtos'>;

export const tamanhoService = {
  async getAll(): Promise<Tamanho[]> {
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .select('*')
      .eq('ativo', true)
      .order('descricao');

    if (error) {
      console.error('[TamanhoService] Erro ao buscar tamanhos:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<Tamanho | null> {
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[TamanhoService] Erro ao buscar tamanho:', error);
      throw error;
    }

    return data;
  },

  async create(tamanho: TamanhoInsert): Promise<Tamanho> {
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .insert(tamanho)
      .select()
      .single();

    if (error) {
      console.error('[TamanhoService] Erro ao criar tamanho:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, tamanho: TamanhoUpdate): Promise<Tamanho> {
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .update({
        ...tamanho,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[TamanhoService] Erro ao atualizar tamanho:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    
    const { error } = await supabase
      .from('tamanhos_produtos')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[TamanhoService] Erro ao desativar tamanho:', error);
      throw error;
    }

  },
};
