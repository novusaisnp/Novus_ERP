import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { 
  MovimentacaoBancaria, 
  MovimentacaoBancariaInput, 
  FiltrosMovimentacoes, 
  EstatisticasMovimentacoes,
  TransferenciaBancaria,
  EstornoMovimentacao,
  ConciliacaoMovimentacao,
  HistoricoMovimentacao,
  DocumentoMovimentacao
} from '@/types/movimentacoesBancarias';

console.log('[MovimentacoesBancarias] Service carregado');

// Função para listar movimentações com filtros
export const listarMovimentacoesBancarias = async (
  filtros?: FiltrosMovimentacoes
): Promise<MovimentacaoBancaria[]> => {
  console.log('[MovimentacoesBancarias] Listando movimentações com filtros:', filtros);

  let query = supabase
    .from('movimentacoes_bancarias')
    .select(`
      *,
      conta_bancaria:contas_bancarias!conta_bancaria_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!conta_destino_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      lote:lotes_movimentacoes (
        id,
        numero_lote,
        descricao_lote,
        tipo_lote,
        status
      )
    `)
    .order('data_movimentacao', { ascending: false })
    .order('created_at', { ascending: false });

  // Aplicar filtros
  if (!filtros?.incluir_inativos) {
    query = query.eq('ativo', true);
  }

  if (filtros?.conta_bancaria_id) {
    query = query.eq('conta_bancaria_id', filtros.conta_bancaria_id);
  }

  if (filtros?.tipo_movimentacao && filtros.tipo_movimentacao !== 'TODOS') {
    query = query.eq('tipo_movimentacao', filtros.tipo_movimentacao);
  }

  if (filtros?.data_inicio) {
    query = query.gte('data_movimentacao', filtros.data_inicio);
  }

  if (filtros?.data_fim) {
    query = query.lte('data_movimentacao', filtros.data_fim);
  }

  if (filtros?.valor_min) {
    query = query.gte('valor', filtros.valor_min);
  }

  if (filtros?.valor_max) {
    query = query.lte('valor', filtros.valor_max);
  }

  if (filtros?.conciliado !== undefined) {
    query = query.eq('conciliado', filtros.conciliado);
  }

  if (filtros?.estornado !== undefined) {
    query = query.eq('estornado', filtros.estornado);
  }

  if (filtros?.documento_referencia) {
    query = query.ilike('documento_referencia', `%${filtros.documento_referencia}%`);
  }

  if (filtros?.lote_id) {
    query = query.eq('lote_id', filtros.lote_id);
  }

  if (filtros?.busca) {
    query = query.or(
      `descricao.ilike.%${filtros.busca}%,observacoes.ilike.%${filtros.busca}%,documento_referencia.ilike.%${filtros.busca}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao listar movimentações:', error);
    throw new Error(`Erro ao listar movimentações: ${error.message}`);
  }

  return (data as MovimentacaoBancaria[]) || [];
};

// Função para obter uma movimentação específica
export const obterMovimentacaoBancaria = async (id: string): Promise<MovimentacaoBancaria | null> => {
  console.log('[MovimentacoesBancarias] Obtendo movimentação:', id);

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .select(`
      *,
      conta_bancaria:contas_bancarias!conta_bancaria_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!conta_destino_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      lote:lotes_movimentacoes (
        id,
        numero_lote,
        descricao_lote,
        tipo_lote,
        status
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[MovimentacoesBancarias] Erro ao obter movimentação:', error);
    throw new Error(`Erro ao obter movimentação: ${error.message}`);
  }

  return data as MovimentacaoBancaria;
};

// Função para criar uma nova movimentação
export const criarMovimentacaoBancaria = async (
  input: MovimentacaoBancariaInput
): Promise<MovimentacaoBancaria> => {
  console.log('[MovimentacoesBancarias] Criando movimentação:', input);

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .insert({
      ...input,
      usuario_criacao_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select(`
      *,
      conta_bancaria:contas_bancarias!conta_bancaria_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!conta_destino_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      )
    `)
    .single();

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao criar movimentação:', error);
    throw new Error(`Erro ao criar movimentação: ${error.message}`);
  }

  return data as MovimentacaoBancaria;
};

// Realiza transferência bancária de forma atômica via RPC do banco
export const realizarTransferenciaBancaria = async (
  transferencia: TransferenciaBancaria
): Promise<{ lote_id: string }> => {
  // Obter empresa do usuário atual
  const { data: empresaId, error: empresaErr } = await supabase.rpc('get_user_empresa_id');
  if (empresaErr || !empresaId) {
    throw new Error('Não foi possível identificar a empresa do usuário');
  }

  const { data, error } = await supabase.rpc('transferencia_bancaria_atomica', {
    p_empresa_id: empresaId,
    p_conta_origem_id: transferencia.conta_origem_id,
    p_conta_destino_id: transferencia.conta_destino_id,
    p_valor: transferencia.valor,
    p_data_lancamento: transferencia.data_movimentacao,
    p_descricao: transferencia.descricao,
    p_lote_descricao: `Transferência: ${transferencia.descricao}`,
    p_natureza_id: (transferencia as any).natureza_id ?? null,
    p_plano_conta_id: (transferencia as any).plano_conta_id ?? null,
    p_centro_custo_id: (transferencia as any).centro_custo_id ?? null,
  });

  if (error) {
    console.error('[MovimentacoesBancarias] Erro na transferência atômica:', error.message);
    throw new Error(`Erro ao realizar transferência: ${error.message}`);
  }

  return { lote_id: data as string };
};

// Função para estornar movimentação
export const estornarMovimentacao = async (
  estorno: EstornoMovimentacao
): Promise<MovimentacaoBancaria> => {
  console.log('[MovimentacoesBancarias] Estornando movimentação:', estorno);

  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .update({
      estornado: true,
      data_estorno: new Date().toISOString(),
      usuario_estorno_id: userId,
      motivo_estorno: estorno.motivo_estorno,
      observacoes: estorno.observacoes,
    })
    .eq('id', estorno.movimentacao_id)
    .eq('estornado', false) // Só estorna se não estiver já estornado
    .select()
    .single();

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao estornar movimentação:', error);
    throw new Error(`Erro ao estornar movimentação: ${error.message}`);
  }

  return data as MovimentacaoBancaria;
};

// Função para conciliar movimentação
export const conciliarMovimentacao = async (
  conciliacao: ConciliacaoMovimentacao
): Promise<MovimentacaoBancaria> => {
  console.log('[MovimentacoesBancarias] Conciliando movimentação:', conciliacao);

  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .update({
      conciliado: true,
      data_conciliacao: new Date().toISOString(),
      usuario_conciliacao_id: userId,
      observacoes: conciliacao.observacoes,
    })
    .eq('id', conciliacao.movimentacao_id)
    .eq('conciliado', false) // Só concilia se não estiver já conciliado
    .select()
    .single();

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao conciliar movimentação:', error);
    throw new Error(`Erro ao conciliar movimentação: ${error.message}`);
  }

  return data as MovimentacaoBancaria;
};

// Função para obter estatísticas
export const obterEstatisticasMovimentacoes = async (
  filtros?: FiltrosMovimentacoes
): Promise<EstatisticasMovimentacoes> => {
  console.log('[MovimentacoesBancarias] Obtendo estatísticas com filtros:', filtros);

  let query = supabase
    .from('movimentacoes_bancarias')
    .select('tipo_movimentacao, valor, estornado, conciliado')
    .eq('ativo', true);

  // Aplicar mesmos filtros da listagem
  if (filtros?.conta_bancaria_id) {
    query = query.eq('conta_bancaria_id', filtros.conta_bancaria_id);
  }

  if (filtros?.data_inicio) {
    query = query.gte('data_movimentacao', filtros.data_inicio);
  }

  if (filtros?.data_fim) {
    query = query.lte('data_movimentacao', filtros.data_fim);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao obter estatísticas:', error);
    throw new Error(`Erro ao obter estatísticas: ${error.message}`);
  }

  // Calcular estatísticas
  const stats: EstatisticasMovimentacoes = {
    total_movimentacoes: data.length,
    total_depositos: 0,
    total_saques: 0,
    total_transferencias: 0,
    total_ajustes: 0,
    valor_total_entradas: 0,
    valor_total_saidas: 0,
    saldo_liquido: 0,
    movimentacoes_conciliadas: 0,
    movimentacoes_estornadas: 0,
  };

  data.forEach((mov) => {
    if (mov.estornado) {
      stats.movimentacoes_estornadas++;
      return;
    }

    if (mov.conciliado) {
      stats.movimentacoes_conciliadas++;
    }

    switch (mov.tipo_movimentacao) {
      case 'DEPOSITO':
      case 'TRANSFERENCIA_ENTRADA':
        stats.total_depositos++;
        stats.valor_total_entradas += mov.valor;
        break;
      case 'SAQUE':
      case 'TRANSFERENCIA_SAIDA':
        stats.total_saques++;
        stats.valor_total_saidas += mov.valor;
        break;
      case 'AJUSTE_POSITIVO':
        stats.total_ajustes++;
        stats.valor_total_entradas += mov.valor;
        break;
      case 'AJUSTE_NEGATIVO':
        stats.total_ajustes++;
        stats.valor_total_saidas += mov.valor;
        break;
    }

    if (mov.tipo_movimentacao.includes('TRANSFERENCIA')) {
      stats.total_transferencias++;
    }
  });

  stats.saldo_liquido = stats.valor_total_entradas - stats.valor_total_saidas;

  return stats;
};

// Função para obter histórico de uma movimentação
export const obterHistoricoMovimentacao = async (
  movimentacaoId: string
): Promise<HistoricoMovimentacao[]> => {
  console.log('[MovimentacoesBancarias] Obtendo histórico da movimentação:', movimentacaoId);

  const { data, error } = await supabase
    .from('historico_movimentacoes_bancarias')
    .select('*')
    .eq('movimentacao_id', movimentacaoId)
    .order('data_operacao', { ascending: false });

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao obter histórico:', error);
    throw new Error(`Erro ao obter histórico: ${error.message}`);
  }

  return (data as HistoricoMovimentacao[]) || [];
};

// Função para obter documentos de uma movimentação
export const obterDocumentosMovimentacao = async (
  movimentacaoId: string
): Promise<DocumentoMovimentacao[]> => {
  console.log('[MovimentacoesBancarias] Obtendo documentos da movimentação:', movimentacaoId);

  const { data, error } = await supabase
    .from('documentos_movimentacoes_bancarias')
    .select('*')
    .eq('movimentacao_id', movimentacaoId)
    .eq('ativo', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao obter documentos:', error);
    throw new Error(`Erro ao obter documentos: ${error.message}`);
  }

  return data || [];
};

// Função para atualizar movimentação
export const atualizarMovimentacaoBancaria = async (
  id: string,
  input: Partial<MovimentacaoBancariaInput>
): Promise<MovimentacaoBancaria> => {
  console.log('[MovimentacoesBancarias] Atualizando movimentação:', id, input);

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .update(input)
    .eq('id', id)
    .eq('estornado', false) // Só atualiza se não estiver estornado
    .select(`
      *,
      conta_bancaria:contas_bancarias!conta_bancaria_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!conta_destino_id (
        id,
        numero_conta,
        titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      )
    `)
    .single();

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao atualizar movimentação:', error);
    throw new Error(`Erro ao atualizar movimentação: ${error.message}`);
  }

  return data as MovimentacaoBancaria;
};

// Função para excluir movimentação (soft delete)
export const excluirMovimentacaoBancaria = async (id: string): Promise<void> => {
  console.log('[MovimentacoesBancarias] Excluindo movimentação:', id);

  const { error } = await supabase
    .from('movimentacoes_bancarias')
    .update({
      ativo: false,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('estornado', false); // Só exclui se não estiver estornado

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao excluir movimentação:', error);
    throw new Error(`Erro ao excluir movimentação: ${error.message}`);
  }
};