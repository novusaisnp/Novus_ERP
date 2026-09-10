
import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Categoria = Tables<'categorias_produtos'>;
export type CategoriaInsert = TablesInsert<'categorias_produtos'>;
export type CategoriaUpdate = TablesUpdate<'categorias_produtos'>;

function translateError(error: any, fallback: string): Error {
  const msg = error?.message || '';
  if (/CATEGORIA_SEM_CLASSIFICACAO_RECEITA/.test(msg)) {
    return new Error('Selecione o Plano de Contas de Receita antes de ativar a categoria');
  }
  if (/CATEGORIA_SEM_CLASSIFICACAO_DESPESA/.test(msg)) {
    return new Error('Selecione o Plano de Contas de Despesa antes de ativar a categoria');
  }
  if (error?.code === '42501') {
    return new Error('Sem permissão para esta operação');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const categoriaService = {
  async getAll(): Promise<Categoria[]> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('nome');

    if (error) {
      console.error('[CategoriaService] Erro ao buscar categorias:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<Categoria | null> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('categorias_produtos')
      .select('*')
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
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
      throw translateError(error, 'Erro ao criar categoria');
    }

    return data;
  },

  async update(id: string, categoria: CategoriaUpdate): Promise<Categoria> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('categorias_produtos')
      .update({
        ...categoria,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('[CategoriaService] Erro ao atualizar categoria:', error);
      throw translateError(error, 'Erro ao atualizar categoria');
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const empresaId = await getEmpresaAtivaIdOuFalha();
    const { error } = await supabase
      .from('categorias_produtos')
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);

    if (error) {
      console.error('[CategoriaService] Erro ao desativar categoria:', error);
      throw error;
    }
  },
};

