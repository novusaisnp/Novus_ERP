import { supabase } from '@/integrations/supabase/client';
import { transformToSupabase } from './contasReceberTransforms';
import type { ContaReceberInput, SupabaseContaReceber } from '@/types/contasReceber';

export const createContaReceber = async (input: ContaReceberInput): Promise<SupabaseContaReceber> => {
  console.log('[ContasReceberOperations] Criando conta a receber:', input);
  
  const payload = transformToSupabase(input);
  console.log('[ContasReceberOperations] Payload transformado:', payload);
  
  const { data, error } = await supabase
    .from('contas_receber')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao criar conta a receber:', error);
    throw new Error(`Erro ao criar conta a receber: ${error.message}`);
  }

  console.log('[ContasReceberOperations] Conta a receber criada:', data);
  return data;
};

export const updateContaReceber = async (id: string, input: ContaReceberInput): Promise<SupabaseContaReceber> => {
  console.log('[ContasReceberOperations] Atualizando conta a receber:', id, input);
  
  const payload = transformToSupabase(input);
  console.log('[ContasReceberOperations] Payload transformado:', payload);
  
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

  console.log('[ContasReceberOperations] Conta a receber atualizada:', data);
  return data;
};

export const deleteContaReceber = async (id: string): Promise<void> => {
  console.log('[ContasReceberOperations] Removendo conta a receber:', id);
  
  const { error } = await supabase
    .from('contas_receber')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ContasReceberOperations] Erro ao remover conta a receber:', error);
    throw new Error(`Erro ao remover conta a receber: ${error.message}`);
  }

  console.log('[ContasReceberOperations] Conta a receber removida com sucesso');
};