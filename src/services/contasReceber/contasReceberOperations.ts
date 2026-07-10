import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { transformToSupabase } from './contasReceberTransforms';
import type { ContaReceberInput, SupabaseContaReceber } from '@/types/contasReceber';

export const createContaReceber = async (input: ContaReceberInput): Promise<SupabaseContaReceber> => {
  
  const payload = transformToSupabase(input);
  
  const { data, error } = await supabase
    .from('contas_receber')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao criar conta a receber:', error);
    throw new Error(`Erro ao criar conta a receber: ${error.message}`);
  }

  return data;
};

export const updateContaReceber = async (id: string, input: ContaReceberInput): Promise<SupabaseContaReceber> => {
  
  const payload = transformToSupabase(input);
  
  const { data, error } = await supabase
    .from('contas_receber')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao atualizar conta a receber:', error);
    throw new Error(`Erro ao atualizar conta a receber: ${error.message}`);
  }

  return data;
};

export const deleteContaReceber = async (id: string): Promise<void> => {
  
  const { error } = await supabase
    .from('contas_receber')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ContasReceberOperations] Erro ao remover conta a receber:', error);
    throw new Error(`Erro ao remover conta a receber: ${error.message}`);
  }

};