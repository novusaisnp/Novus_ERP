import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { transformToSupabase } from './contasReceberTransforms';
import type { ContaReceberInput } from '@/types/contasReceber';

export const createContaReceber = async (input: ContaReceberInput) => {
  const payload = transformToSupabase(input);
  const { data, error } = await supabase
    .from('contas_receber')
    .insert(payload)
    .select(
      `
      *,
      cliente:clientes(id, nome, cpf, cnpj)
    `,
    )
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao criar:', error);
    throw new Error(error.message || 'Erro ao criar conta a receber');
  }
  return data;
};

export const updateContaReceber = async (id: string, input: ContaReceberInput) => {
  const payload = transformToSupabase(input);
  const { data, error } = await supabase
    .from('contas_receber')
    .update(payload)
    .eq('id', id)
    .select(
      `
      *,
      cliente:clientes(id, nome, cpf, cnpj)
    `,
    )
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao atualizar:', error);
    throw new Error(error.message || 'Erro ao atualizar conta a receber');
  }
  return data;
};

/**
 * Soft delete: marca `deleted_at` para respeitar a política de auditoria.
 */
export const deleteContaReceber = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('contas_receber')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[ContasReceberOperations] Erro ao remover:', error);
    throw new Error(error.message || 'Erro ao remover conta a receber');
  }
};
