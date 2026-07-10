
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import type { CentroCusto, CentroCustoInput, SupabaseCentroCusto } from '@/types/configuracoes';

const transformFromSupabase = (data: SupabaseCentroCusto): CentroCusto => ({
  id: data.id,
  nome: data.nome,
  codigo: data.codigo || undefined,
  descricao: data.descricao || undefined,
  ativo: data.ativo,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

export const centroCustoService = {
  async getAll(): Promise<CentroCusto[]> {
    console.log('[CentroCusto] Buscando todos os centros de custo');
    
    const { data, error } = await supabase
      .from('centros_custo')
      .select('*')
      .order('nome');

    if (error) {
      console.error('[CentroCusto] Erro ao buscar centros de custo:', error);
      throw new Error(`Erro ao buscar centros de custo: ${error.message}`);
    }

    return data.map(transformFromSupabase);
  },

  async getById(id: string): Promise<CentroCusto | null> {
    console.log('[CentroCusto] Buscando centro de custo por ID:', id);
    
    const { data, error } = await supabase
      .from('centros_custo')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[CentroCusto] Erro ao buscar centro de custo:', error);
      throw new Error(`Erro ao buscar centro de custo: ${error.message}`);
    }

    return data ? transformFromSupabase(data) : null;
  },

  async create(input: CentroCustoInput): Promise<CentroCusto> {
    console.log('[CentroCusto] Criando novo centro de custo:', input);

    // Validar se já existe um centro de custo com o mesmo nome
    const { data: existing } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('nome', input.nome)
      .maybeSingle();

    if (existing) {
      throw new Error('Já existe um centro de custo com este nome');
    }

    const { data, error } = await supabase
      .from('centros_custo')
      .insert([{
        nome: input.nome,
        codigo: input.codigo || null,
        descricao: input.descricao || null,
        ativo: input.ativo,
      }])
      .select()
      .single();

    if (error) {
      console.error('[CentroCusto] Erro ao criar centro de custo:', error);
      throw new Error(`Erro ao criar centro de custo: ${error.message}`);
    }

    console.log('[CentroCusto] Centro de custo criado com sucesso:', data);
    return transformFromSupabase(data);
  },

  async update(id: string, input: CentroCustoInput): Promise<CentroCusto> {
    console.log('[CentroCusto] Atualizando centro de custo:', id, input);

    // Validar se já existe outro centro de custo com o mesmo nome
    const { data: existing } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('nome', input.nome)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      throw new Error('Já existe um centro de custo com este nome');
    }

    const { data, error } = await supabase
      .from('centros_custo')
      .update({
        nome: input.nome,
        codigo: input.codigo || null,
        descricao: input.descricao || null,
        ativo: input.ativo,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[CentroCusto] Erro ao atualizar centro de custo:', error);
      throw new Error(`Erro ao atualizar centro de custo: ${error.message}`);
    }

    console.log('[CentroCusto] Centro de custo atualizado com sucesso:', data);
    return transformFromSupabase(data);
  },

  async delete(id: string): Promise<void> {
    console.log('[CentroCusto] Removendo centro de custo:', id);

    const { error } = await supabase
      .from('centros_custo')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CentroCusto] Erro ao remover centro de custo:', error);
      throw new Error(`Erro ao remover centro de custo: ${error.message}`);
    }

    console.log('[CentroCusto] Centro de custo removido com sucesso');
  },
};
