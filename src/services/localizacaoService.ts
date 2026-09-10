
import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Localizacao = Tables<'localizacoes_estoque'>;
export type LocalizacaoInsert = TablesInsert<'localizacoes_estoque'>;
export type LocalizacaoUpdate = TablesUpdate<'localizacoes_estoque'>;

export const localizacaoService = {
  async getAll(): Promise<Localizacao[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('[LocalizacaoService] Erro ao buscar localizações:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<Localizacao | null> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .select('*')
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao buscar localização:', error);
      throw error;
    }

    return data;
  },

  async create(localizacao: LocalizacaoInsert): Promise<Localizacao> {
    
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .insert(localizacao)
      .select()
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao criar localização:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, localizacao: LocalizacaoUpdate): Promise<Localizacao> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .update({
        ...localizacao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('[LocalizacaoService] Erro ao atualizar localização:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const empresaId = await getEmpresaAtivaIdOuFalha();

    // Verificar se não é a única localização ativa DESTA empresa — sem o filtro de
    // empresa aqui, a contagem somava localizações de todas as empresas (achado real:
    // uma empresa com 0 localizações não era bloqueada porque outra empresa tinha 1+).
    const { data: localizacoes, error: countError } = await supabase
      .from('localizacoes_estoque')
      .select('id')
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true);

    if (countError) {
      console.error('[LocalizacaoService] Erro ao verificar localizações:', countError);
      throw countError;
    }

    if (localizacoes && localizacoes.length <= 1) {
      throw new Error('Não é possível desativar a única localização ativa');
    }

    const { data, error } = await supabase
      .from('localizacoes_estoque')
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select('id');

    if (error) {
      console.error('[LocalizacaoService] Erro ao desativar localização:', error);
      throw error;
    }

    // Update sem .select() nunca reporta erro quando o RLS bloqueia e afeta 0 linhas —
    // sem essa checagem, a UI mostrava "sucesso" mesmo sem nada ter mudado no banco.
    if (!data || data.length === 0) {
      throw new Error('Não foi possível desativar esta localização — você pode não ter permissão para esta empresa.');
    }
  },
};
