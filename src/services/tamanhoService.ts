
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Tamanho = Tables<'tamanhos_produtos'>;
export type TamanhoInsert = TablesInsert<'tamanhos_produtos'>;
export type TamanhoUpdate = TablesUpdate<'tamanhos_produtos'>;

export const tamanhoService = {
  async getAll(): Promise<Tamanho[]> {
    console.log('[TamanhoService] Buscando todos os tamanhos');
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .select('*')
      .eq('ativo', true)
      .order('descricao');

    if (error) {
      console.error('[TamanhoService] Erro ao buscar tamanhos:', error);
      throw error;
    }

    console.log('[TamanhoService] Tamanhos encontrados:', data?.length || 0);
    return data || [];
  },

  async getById(id: string): Promise<Tamanho | null> {
    console.log('[TamanhoService] Buscando tamanho por ID:', id);
    
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
    console.log('[TamanhoService] Criando tamanho:', tamanho.descricao);
    
    const { data, error } = await supabase
      .from('tamanhos_produtos')
      .insert(tamanho)
      .select()
      .single();

    if (error) {
      console.error('[TamanhoService] Erro ao criar tamanho:', error);
      throw error;
    }

    console.log('[TamanhoService] Tamanho criado com sucesso:', data.id);
    return data;
  },

  async update(id: string, tamanho: TamanhoUpdate): Promise<Tamanho> {
    console.log('[TamanhoService] Atualizando tamanho:', id);
    
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

    console.log('[TamanhoService] Tamanho atualizado com sucesso');
    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[TamanhoService] Desativando tamanho:', id);
    
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

    console.log('[TamanhoService] Tamanho desativado com sucesso');
  },
};
