
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Categoria = Tables<'categorias_produtos'>;
export type CategoriaInsert = TablesInsert<'categorias_produtos'>;
export type CategoriaUpdate = TablesUpdate<'categorias_produtos'>;

export const categoriaService = {
  async getAll(): Promise<Categoria[]> {
    
    const { data, error } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[CategoriaService] Erro ao buscar categorias:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<Categoria | null> {
    
    const { data, error } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[CategoriaService] Erro ao buscar categoria:', error);
      throw error;
    }

    return data;
  },

  async create(categoria: CategoriaInsert): Promise<Categoria> {
    
    const { data, error } = await supabase
      .from('categorias_produtos')
      .insert(categoria)
      .select()
      .single();

    if (error) {
      console.error('[CategoriaService] Erro ao criar categoria:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, categoria: CategoriaUpdate): Promise<Categoria> {
    
    const { data, error } = await supabase
      .from('categorias_produtos')
      .update({
        ...categoria,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[CategoriaService] Erro ao atualizar categoria:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    
    const { error } = await supabase
      .from('categorias_produtos')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[CategoriaService] Erro ao desativar categoria:', error);
      throw error;
    }

  },
};
