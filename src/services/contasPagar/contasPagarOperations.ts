
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
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

// Rateios no formato que a RPC espera. `descricao` na UI vira `observacoes` na tabela.
const buildRateios = (input: ContaPagarInput) =>
  (input.rateios || []).map(rateio => ({
    plano_conta_id: rateio.plano_conta_id || null,
    centro_custo_id: rateio.centro_custo_id || null,
    valor: rateio.valor,
    percentual: rateio.percentual,
    observacoes: rateio.descricao || null,
  }));

// Título e rateios são gravados na mesma transação pela RPC; antes eram chamadas separadas
// com compensação manual, e uma falha no meio deixava o título sem rateios.
const salvarTitulo = async (input: ContaPagarInput, id?: string) => {
  const { data, error } = await supabase.rpc('financeiro_salvar_titulo', {
    p_tipo_titulo: 'CONTAS_PAGAR',
    p_dados: buildPayload(input) as unknown as Json,
    p_rateios: buildRateios(input) as unknown as Json,
    p_empresa_id: await getEmpresaIdAtual(),
    ...(id ? { p_titulo_id: id } : {}),
  });

  if (error) {
    console.error('[ContasPagarOperations] Erro ao salvar conta a pagar:', error);
    throw new Error(`Erro ao salvar conta a pagar: ${error.message}`);
  }
  return data as string;
};

const buscarContaCompleta = async (id: string, empresaId: string) => {
  const { data, error } = await supabase
    .from('contas_pagar')
    .select(`
      *,
      fornecedores:entidades!contas_pagar_fornecedor_id_fkey(id, razao_social, nome_fantasia),
      plano_contas!contas_pagar_plano_conta_id_fkey(id, codigo, nome),
      centros_custo!contas_pagar_centro_custo_id_fkey(id, nome, codigo)
    `)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
    .single();

  if (error) {
    console.error('[ContasPagarOperations] Erro ao buscar conta:', error);
    throw new Error(`Erro ao buscar conta: ${error.message}`);
  }
  return data;
};

export const createContaPagar = async (input: ContaPagarInput) => {
  const empresaId = await getEmpresaIdAtual();
  const id = await salvarTitulo(input);
  return buscarContaCompleta(id, empresaId);
};

export const updateContaPagar = async (id: string, input: ContaPagarInput) => {
  const empresaId = await getEmpresaIdAtual();
  await salvarTitulo(input, id);
  return buscarContaCompleta(id, empresaId);
};

export const deleteContaPagar = async (id: string) => {
  const empresaId = await getEmpresaIdAtual();
  // Soft delete via deleted_at (coluna real na tabela).
  // Título com liquidação ativa é barrado por trigger no banco; a correção é por estorno.
  const { error } = await supabase
    .from('contas_pagar')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);

  if (error) {
    console.error('[ContasPagarOperations] Erro ao remover conta a pagar:', error);
    throw new Error(`Erro ao remover conta a pagar: ${error.message}`);
  }
};
