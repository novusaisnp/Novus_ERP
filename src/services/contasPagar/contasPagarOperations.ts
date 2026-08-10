
import { supabase } from '@/integrations/supabase/client';
import { uiStatusPagarToDb } from '@/lib/statusMappers';
import type { ContaPagarInput } from '@/types/contasPagar';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

// Monta payload apenas com colunas que realmente existem em public.contas_pagar.
const buildPayload = (input: ContaPagarInput) => {
  // 'UNICA' é sinônimo de "sem recorrência" na UI; DB só aceita periodicidades reais
  const periodicidade = input.periodicidade && input.periodicidade !== 'UNICA'
    ? input.periodicidade
    : null;
  return {
    numero_documento: input.numero_documento,
    descricao: input.descricao,
    fornecedor_id: input.fornecedor_id || null,
    plano_conta_id: input.plano_conta_id || null,
    centro_custo_id: input.centro_custo_id || null,
    valor_original: input.valor_original,
    data_vencimento: input.data_vencimento,
    data_emissao: input.data_emissao,
    data_competencia: input.data_competencia || null,
    status: uiStatusPagarToDb(input.situacao || 'ABERTA'),
    observacoes: input.observacoes || null,
    numero_parcela: input.numero_parcela || null,
    total_parcelas: input.total_parcelas || null,
    recorrente: Boolean(input.recorrente),
    periodicidade,
  };
};

export const createContaPagar = async (input: ContaPagarInput) => {
  const empresaId = await getEmpresaIdAtual();
  const { data: contaData, error: contaError } = await supabase
    .from('contas_pagar')
    .insert([{ ...buildPayload(input), empresa_representada_id: empresaId }])
    .select('id')
    .single();

  if (contaError) {
    console.error('[ContasPagarOperations] Erro ao criar conta a pagar:', contaError);
    throw new Error(`Erro ao criar conta a pagar: ${contaError.message}`);
  }

  // Se há rateios, inserir cada um como linha separada
  if (input.rateios && input.rateios.length > 0) {
    
    const rateiosData = input.rateios.map(rateio => ({
      conta_pagar_id: contaData.id,
      empresa_representada_id: empresaId,
      plano_conta_id: rateio.plano_conta_id,
      centro_custo_id: rateio.centro_custo_id || null,
      valor: rateio.valor,
      percentual: rateio.percentual,
      observacoes: rateio.descricao || null,
    }));

    const { error: rateiosError } = await supabase
      .from('rateios_contas_pagar')
      .insert(rateiosData);

    if (rateiosError) {
      console.error('[ContasPagarOperations] Erro ao inserir rateios:', rateiosError);
      // Reverter a conta criada
      await supabase.from('contas_pagar').delete().eq('id', contaData.id);
      throw new Error(`Erro ao inserir rateios: ${rateiosError.message}`);
    }
  }

  // Buscar conta completa com relacionamentos
  const { data: contaCompleta, error: fetchError } = await supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores!contas_pagar_fornecedor_id_fkey(id, razao_social, nome_fantasia),
      plano_contas!contas_pagar_plano_conta_id_fkey(id, codigo, nome),
      centros_custo!contas_pagar_centro_custo_id_fkey(id, nome, codigo)
    `)
    .eq('id', contaData.id)
    .eq('empresa_representada_id', empresaId)
    .single();

  if (fetchError) {
    console.error('[ContasPagarOperations] Erro ao buscar conta criada:', fetchError);
    throw new Error(`Erro ao buscar conta criada: ${fetchError.message}`);
  }

  return contaCompleta;
};

export const updateContaPagar = async (id: string, input: ContaPagarInput) => {
  const empresaId = await getEmpresaIdAtual();
  const { error: contaError } = await supabase
    .from('contas_pagar')
    .update(buildPayload(input))
    .eq('id', id)
    .select('id')
    .single();

  if (contaError) {
    console.error('[ContasPagarOperations] Erro ao atualizar conta a pagar:', contaError);
    throw new Error(`Erro ao atualizar conta a pagar: ${contaError.message}`);
  }

  // Remover rateios existentes
  const { error: deleteRateiosError } = await supabase
    .from('rateios_contas_pagar')
    .delete()
    .eq('conta_pagar_id', id);

  if (deleteRateiosError) {
    console.error('[ContasPagarOperations] Erro ao remover rateios existentes:', deleteRateiosError);
    throw new Error(`Erro ao remover rateios existentes: ${deleteRateiosError.message}`);
  }

  // Se há rateios, inserir os novos
  if (input.rateios && input.rateios.length > 0) {
    
    const rateiosData = input.rateios.map(rateio => ({
      conta_pagar_id: id,
      empresa_representada_id: empresaId,
      plano_conta_id: rateio.plano_conta_id,
      centro_custo_id: rateio.centro_custo_id || null,
      valor: rateio.valor,
      percentual: rateio.percentual,
      observacoes: rateio.descricao || null,
    }));

    const { error: rateiosError } = await supabase
      .from('rateios_contas_pagar')
      .insert(rateiosData);

    if (rateiosError) {
      console.error('[ContasPagarOperations] Erro ao inserir novos rateios:', rateiosError);
      throw new Error(`Erro ao inserir novos rateios: ${rateiosError.message}`);
    }
  }

  // Buscar conta completa com relacionamentos
  const { data: contaCompleta, error: fetchError } = await supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores!contas_pagar_fornecedor_id_fkey(id, razao_social, nome_fantasia),
      plano_contas!contas_pagar_plano_conta_id_fkey(id, codigo, nome),
      centros_custo!contas_pagar_centro_custo_id_fkey(id, nome, codigo)
    `)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .single();

  if (fetchError) {
    console.error('[ContasPagarOperations] Erro ao buscar conta atualizada:', fetchError);
    throw new Error(`Erro ao buscar conta atualizada: ${fetchError.message}`);
  }

  return contaCompleta;
};

export const deleteContaPagar = async (id: string) => {
  // Soft delete via deleted_at (coluna real na tabela)
  const { error } = await supabase
    .from('contas_pagar')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[ContasPagarOperations] Erro ao remover conta a pagar:', error);
    throw new Error(`Erro ao remover conta a pagar: ${error.message}`);
  }
};
