
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Localizacao = Tables<'localizacoes_estoque'>;
export type LocalizacaoInsert = TablesInsert<'localizacoes_estoque'>;
export type LocalizacaoUpdate = TablesUpdate<'localizacoes_estoque'>;

export const localizacaoService = {
  async getAll(): Promise<Localizacao[]> {
    console.log('[LocalizacaoService] Buscando todas as localizações');
    
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[LocalizacaoService] Erro ao buscar localizações:', error);
      throw error;
    }

    console.log('[LocalizacaoService] Localizações encontradas:', data?.length || 0);
    return data || [];
  },

  async getById(id: string): Promise<Localizacao | null> {
    console.log('[LocalizacaoService] Buscando localização por ID:', id);
    
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao buscar localização:', error);
      throw error;
    }

    return data;
  },

  async create(localizacao: LocalizacaoInsert): Promise<Localizacao> {
    console.log('[LocalizacaoService] Criando localização:', localizacao.nome);
    
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .insert(localizacao)
      .select()
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao criar localização:', error);
      throw error;
    }

    console.log('[LocalizacaoService] Localização criada com sucesso:', data.id);
    return data;
  },

  async update(id: string, localizacao: LocalizacaoUpdate): Promise<Localizacao> {
    console.log('[LocalizacaoService] Atualizando localização:', id);
    
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .update({
        ...localizacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao atualizar localização:', error);
      throw error;
    }

    console.log('[LocalizacaoService] Localização atualizada com sucesso');
    return data;
  },

  async delete(id: string): Promise<void> {
    console.log('[LocalizacaoService] Verificando se pode desativar localização:', id);
    
    // Verificar se não é a única localização ativa
    const { data: localizacoes, error: countError } = await supabase
      .from('localizacoes_estoque')
      .select('id')
      .eq('ativo', true);

    if (countError) {
      console.error('[LocalizacaoService] Erro ao verificar localizações:', countError);
      throw countError;
    }

    if (localizacoes && localizacoes.length <= 1) {
      throw new Error('Não é possível desativar a única localização ativa');
    }

    const { error } = await supabase
      .from('localizacoes_estoque')
      .update({ 
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[LocalizacaoService] Erro ao desativar localização:', error);
      throw error;
    }

    console.log('[LocalizacaoService] Localização desativada com sucesso');
  },
};
