import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { transformToSupabase } from './contasReceberTransforms';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';
import type { ContaReceberInput, RateioContaReceber } from '@/types/contasReceber';


// Rateios no formato que a RPC espera; o vínculo e a empresa são resolvidos no servidor.
const buildRateiosPayload = (rateios: RateioContaReceber[] = []) =>
  rateios.map((r) => ({
    plano_conta_id: r.plano_conta_id || null,
    centro_custo_id: r.centro_custo_id || null,
    valor: r.valor,
    percentual: r.percentual,
    observacoes: r.observacoes || null,
  }));

// Título e rateios são gravados na mesma transação pela RPC; antes eram chamadas separadas,
// e uma falha na reinserção deixava o título com zero rateios, em silêncio.
const salvarTitulo = async (input: ContaReceberInput, id?: string) => {
  const { data, error } = await supabase.rpc('financeiro_salvar_titulo', {
    p_tipo_titulo: 'CONTAS_RECEBER',
    p_dados: transformToSupabase(input) as unknown as Json,
    p_rateios: buildRateiosPayload(input.rateios) as unknown as Json,
    p_empresa_id: await getEmpresaIdAtual(),
    ...(id ? { p_titulo_id: id } : {}),
  });

  if (error) {
    console.error('[ContasReceberOperations] Erro ao salvar:', error);
    throw new Error(error.message || 'Erro ao salvar conta a receber');
  }
  return data as string;
};

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

const buscarContaCompleta = async (id: string) => {
  const { data, error } = await supabase
    .from('contas_receber')
    .select(selectComRateios)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[ContasReceberOperations] Erro ao buscar conta:', error);
    throw new Error(error.message || 'Erro ao buscar conta a receber');
  }
  return data;
};

export const createContaReceber = async (input: ContaReceberInput) => {
  const id = await salvarTitulo(input);
  return buscarContaCompleta(id);
};

export const updateContaReceber = async (
  id: string,
  input: ContaReceberInput,
) => {
  await salvarTitulo(input, id);
  return buscarContaCompleta(id);
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
