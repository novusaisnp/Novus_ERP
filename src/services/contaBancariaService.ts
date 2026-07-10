import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { ContaBancaria, ContaBancariaInput, ContaBancariaFilters, ContaBancariaEstatisticas } from '@/types/contaBancaria';

console.log('[ContaBancariaService] Serviço de contas bancárias carregado');

export const listarContasBancarias = async (filtros?: ContaBancariaFilters): Promise<ContaBancaria[]> => {
  console.log('[ContaBancariaService] Listando contas bancárias com filtros:', filtros);
  
  let query = supabase
    .from('contas_bancarias')
    .select(`
      *,
      agencia:agencias_bancarias(
        numero_agencia,
        descricao,
        banco:bancos(
          codigo,
          nome
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (!filtros?.incluir_arquivadas) {
    query = query.is('deleted_at', null);
  }

  if (filtros?.numero_conta) {
    query = query.ilike('numero_conta', `%${filtros.numero_conta}%`);
  }

  if (filtros?.titular) {
    query = query.ilike('titular', `%${filtros.titular}%`);
  }

  if (filtros?.tipo_conta && filtros.tipo_conta !== 'all') {
    query = query.eq('tipo_conta', filtros.tipo_conta);
  }

  if (filtros?.status && filtros.status !== 'all') {
    query = query.eq('status', filtros.status);
  }

  if (filtros?.agencia_id && filtros.agencia_id !== 'all') {
    query = query.eq('agencia_id', filtros.agencia_id);
  }

  if (filtros?.conta_cofre !== undefined) {
    query = query.eq('conta_cofre', filtros.conta_cofre);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[ContaBancariaService] Erro ao listar contas bancárias:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Contas bancárias listadas:', data?.length);
  return data as ContaBancaria[] || [];
};

export const criarContaBancaria = async (input: ContaBancariaInput): Promise<ContaBancaria> => {
  console.log('[ContaBancariaService] Criando conta bancária:', input);

  const contaData = {
    ...input,
    saldo_atual: input.saldo_inicial,
    status: input.status || 'ATIVA',
    configuracoes: input.configuracoes || {
      enviar_alertas: true,
      controlar_limite: true,
      permitir_saldo_negativo: false
    },
    // Para contas cofre, agencia_id pode ser null
    agencia_id: input.conta_cofre ? null : input.agencia_id
  };

  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert(contaData)
    .select(`
      *,
      agencia:agencias_bancarias(
        numero_agencia,
        descricao,
        banco:bancos(
          codigo,
          nome
        )
      )
    `)
    .single();

  if (error) {
    console.error('[ContaBancariaService] Erro ao criar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária criada:', data.id);
  return data as ContaBancaria;
};

export const atualizarContaBancaria = async (id: string, input: Partial<ContaBancariaInput>): Promise<ContaBancaria> => {
  console.log('[ContaBancariaService] Atualizando conta bancária:', id, input);

  // Ajustar agencia_id para contas cofre
  const updateData = {
    ...input,
    agencia_id: input.conta_cofre ? null : input.agencia_id
  };

  const { data, error } = await supabase
    .from('contas_bancarias')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      agencia:agencias_bancarias(
        numero_agencia,
        descricao,
        banco:bancos(
          codigo,
          nome
        )
      )
    `)
    .single();

  if (error) {
    console.error('[ContaBancariaService] Erro ao atualizar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária atualizada:', data.id);
  return data as ContaBancaria;
};

export const arquivarContaBancaria = async (id: string): Promise<void> => {
  console.log('[ContaBancariaService] Arquivando conta bancária:', id);

  const { error } = await supabase
    .from('contas_bancarias')
    .update({ 
      deleted_at: new Date().toISOString(),
      status: 'INATIVA'
    })
    .eq('id', id);

  if (error) {
    console.error('[ContaBancariaService] Erro ao arquivar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária arquivada:', id);
};

export const restaurarContaBancaria = async (id: string): Promise<void> => {
  console.log('[ContaBancariaService] Restaurando conta bancária:', id);

  const { error } = await supabase
    .from('contas_bancarias')
    .update({ 
      deleted_at: null,
      status: 'ATIVA'
    })
    .eq('id', id);

  if (error) {
    console.error('[ContaBancariaService] Erro ao restaurar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária restaurada:', id);
};

export const obterEstatisticasContasBancarias = async (): Promise<ContaBancariaEstatisticas> => {
  console.log('[ContaBancariaService] Obtendo estatísticas das contas bancárias');

  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('tipo_conta, status, conta_cofre, saldo_atual, limite_credito')
    .is('deleted_at', null);

  if (error) {
    console.error('[ContaBancariaService] Erro ao obter estatísticas:', error);
    throw new Error(error.message);
  }

  const total = data?.length || 0;
  const ativas = data?.filter(c => c.status === 'ATIVA').length || 0;
  const inativas = total - ativas;
  const contas_corrente = data?.filter(c => c.tipo_conta === 'CORRENTE').length || 0;
  const contas_poupanca = data?.filter(c => c.tipo_conta === 'POUPANCA').length || 0;
  const contas_cofre = data?.filter(c => c.conta_cofre === true).length || 0;
  const saldo_total = data?.reduce((sum, c) => sum + (c.saldo_atual || 0), 0) || 0;
  const limite_total = data?.reduce((sum, c) => sum + (c.limite_credito || 0), 0) || 0;

  console.log('[ContaBancariaService] Estatísticas obtidas:', { total, ativas, inativas });

  return {
    total,
    ativas,
    inativas,
    contas_corrente,
    contas_poupanca,
    contas_cofre,
    saldo_total,
    limite_total
  };
};
