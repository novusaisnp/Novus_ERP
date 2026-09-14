import { supabase } from '@/integrations/supabase/client';
import type { CentroCusto, CentroCustoInput, SupabaseCentroCusto } from '@/types/configuracoes';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';

const transformFromSupabase = (data: SupabaseCentroCusto): CentroCusto => ({
  id: data.id,
  nome: data.nome,
  codigo: data.codigo || undefined,
  descricao: data.descricao || undefined,
  ativo: data.ativo,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

function translateError(error: any, fallback: string): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '23505' || /duplicate key|already exists/i.test(msg)) {
    return new Error('Já existe um centro de custo com este nome ou código');
  }
  if (code === '42501' || /row-level security|permission/i.test(msg)) {
    return new Error('Sem permissão para esta operação na empresa selecionada');
  }
  if (code === '23502') {
    return new Error('Dados obrigatórios ausentes para salvar o centro de custo');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const centroCustoService = {
  async getAll(): Promise<CentroCusto[]> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('centros_custo')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .order('nome');

    if (error) {
      console.error('[CentroCusto] Erro ao buscar centros de custo:', error);
      throw new Error(`Erro ao buscar centros de custo: ${error.message}`);
    }

    return (data || []).map(transformFromSupabase);
  },

  async getById(id: string): Promise<CentroCusto | null> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('centros_custo')
      .select('*')
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar centro de custo: ${error.message}`);
    }
    return data ? transformFromSupabase(data) : null;
  },

  async create(input: CentroCustoInput): Promise<CentroCusto> {
    const empresa_representada_id = await getEmpresaId();

    // Nome único no escopo da empresa
    const { data: existing } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('empresa_representada_id', empresa_representada_id)
      .eq('nome', input.nome.trim())
      .maybeSingle();

    if (existing) {
      throw new Error('Já existe um centro de custo com este nome nesta empresa');
    }

    const { data, error } = await supabase
      .from('centros_custo')
      .insert([{
        empresa_representada_id,
        nome: input.nome.trim(),
        codigo: input.codigo?.trim() || null,
        descricao: input.descricao?.trim() || null,
        ativo: input.ativo,
      }])
      .select()
      .single();

    if (error) {
      console.error('[CentroCusto] Erro ao criar:', error);
      throw translateError(error, 'Erro ao criar centro de custo');
    }
    return transformFromSupabase(data);
  },

  async update(id: string, input: CentroCustoInput): Promise<CentroCusto> {
    const empresa_representada_id = await getEmpresaId();

    const { data: existing } = await supabase
      .from('centros_custo')
      .select('id')
      .eq('empresa_representada_id', empresa_representada_id)
      .eq('nome', input.nome.trim())
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      throw new Error('Já existe um centro de custo com este nome nesta empresa');
    }

    const { data, error } = await supabase
      .from('centros_custo')
      .update({
        nome: input.nome.trim(),
        codigo: input.codigo?.trim() || null,
        descricao: input.descricao?.trim() || null,
        ativo: input.ativo,
      })
      .eq('id', id)
      .eq('empresa_representada_id', empresa_representada_id)
      .select()
      .single();

    if (error) {
      console.error('[CentroCusto] Erro ao atualizar:', error);
      throw translateError(error, 'Erro ao atualizar centro de custo');
    }
    return transformFromSupabase(data);
  },

  async delete(id: string): Promise<void> {
    const empresaId = await getEmpresaId();
    const { error } = await supabase
      .from('centros_custo')
      .delete()
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);

    if (error) {
      throw translateError(error, 'Erro ao remover centro de custo');
    }
  },
};
