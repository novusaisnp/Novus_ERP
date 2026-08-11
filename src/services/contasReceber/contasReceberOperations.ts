import { supabase } from '@/integrations/supabase/client';
import { transformToSupabase } from './contasReceberTransforms';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';
import type { ContaReceberInput, RateioContaReceber } from '@/types/contasReceber';


const buildRateiosPayload = (
  contaReceberId: string,
  empresaId: string,
  rateios: RateioContaReceber[],
) =>
  rateios.map((r) => ({
    conta_receber_id: contaReceberId,
    empresa_representada_id: empresaId,
    plano_conta_id: r.plano_conta_id,
    centro_custo_id: r.centro_custo_id || null,
    valor: r.valor,
    percentual: r.percentual,
    observacoes: r.observacoes || null,
  }));

const selectComRateios = `
  *,
  cliente:entidades!contas_receber_cliente_id_fkey(id, nome, cpf, cnpj),
  rateios:rateios_contas_receber (
    id,
    plano_conta_id,
    centro_custo_id,
    valor,
    percentual,
    observacoes,
    plano_conta:plano_contas (id, codigo, nome, tipo),
    centro_custo:centros_custo (id, nome, codigo)
  )
`;

export const createContaReceber = async (input: ContaReceberInput) => {
  const payload = transformToSupabase(input);
  const { data, error } = await supabase
    .from('contas_receber')
    .insert(payload)
    .select('id, empresa_representada_id')
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao criar:', error);
    throw new Error(error.message || 'Erro ao criar conta a receber');
  }

  if (input.rateios && input.rateios.length > 0) {
    const rateiosData = buildRateiosPayload(
      data.id,
      data.empresa_representada_id,
      input.rateios,
    );
    const { error: rateiosError } = await supabase
      .from('rateios_contas_receber')
      .insert(rateiosData);

    if (rateiosError) {
      console.error(
        '[ContasReceberOperations] Erro ao inserir rateios:',
        rateiosError,
      );
      await supabase
        .from('contas_receber')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', data.id);
      throw new Error(
        `Erro ao inserir rateios: ${rateiosError.message}`,
      );
    }
  }

  const { data: contaCompleta, error: fetchError } = await supabase
    .from('contas_receber')
    .select(selectComRateios)
    .eq('id', data.id)
    .single();

  if (fetchError) {
    console.error(
      '[ContasReceberOperations] Erro ao buscar conta criada:',
      fetchError,
    );
    throw new Error(fetchError.message || 'Erro ao buscar conta criada');
  }
  return contaCompleta;
};

export const updateContaReceber = async (
  id: string,
  input: ContaReceberInput,
) => {
  const payload = transformToSupabase(input);
  const empresaId = await getEmpresaIdAtual();
  const { data, error } = await supabase
    .from('contas_receber')
    .update(payload)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .select('id, empresa_representada_id')
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao atualizar:', error);
    throw new Error(error.message || 'Erro ao atualizar conta a receber');
  }

  // Substituir rateios (delete + insert)
  const { error: deleteError } = await supabase
    .from('rateios_contas_receber')
    .delete()
    .eq('conta_receber_id', id);

  if (deleteError) {
    console.error(
      '[ContasReceberOperations] Erro ao remover rateios antigos:',
      deleteError,
    );
    throw new Error(
      `Erro ao remover rateios antigos: ${deleteError.message}`,
    );
  }

  if (input.rateios && input.rateios.length > 0) {
    const rateiosData = buildRateiosPayload(
      id,
      data.empresa_representada_id,
      input.rateios,
    );
    const { error: rateiosError } = await supabase
      .from('rateios_contas_receber')
      .insert(rateiosData);

    if (rateiosError) {
      console.error(
        '[ContasReceberOperations] Erro ao inserir novos rateios:',
        rateiosError,
      );
      throw new Error(
        `Erro ao inserir novos rateios: ${rateiosError.message}`,
      );
    }
  }

  const { data: contaCompleta, error: fetchError } = await supabase
    .from('contas_receber')
    .select(selectComRateios)
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error(
      '[ContasReceberOperations] Erro ao buscar conta atualizada:',
      fetchError,
    );
    throw new Error(
      fetchError.message || 'Erro ao buscar conta atualizada',
    );
  }
  return contaCompleta;
};

/**
 * Soft delete: marca `deleted_at` para respeitar a política de auditoria.
 * Título com liquidação ativa é barrado por trigger no banco; a correção é por estorno.
 */
export const deleteContaReceber = async (id: string): Promise<void> => {
  const empresaId = await getEmpresaIdAtual();
  const { error } = await supabase
    .from('contas_receber')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);

  if (error) {
    console.error('[ContasReceberOperations] Erro ao remover:', error);
    throw new Error(error.message || 'Erro ao remover conta a receber');
  }
};
