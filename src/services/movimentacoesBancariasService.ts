import { supabase } from '@/integrations/supabase/client';
import { BankingError } from '@/lib/bankingErrors';
import {
  MovimentacaoBancaria,
  MovimentacaoBancariaInput,
  FiltrosMovimentacoes,
  EstatisticasMovimentacoes,
  TransferenciaBancaria,
  EstornoMovimentacao,
  ConciliacaoMovimentacao,
  HistoricoMovimentacao,
  DocumentoMovimentacao,
  TipoMovimentacao,
} from '@/types/movimentacoesBancarias';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

type TransferenciaExtras = { natureza_id?: string; plano_conta_id?: string; centro_custo_id?: string };

/**
 * [LOTE 3D] Estratégia futura de atomicidade de saldo (NÃO implementada neste lote):
 *   - Envolver INSERT em `movimentacoes_bancarias` + recálculo de `saldo_atual`
 *     em uma RPC PostgreSQL única, com `SELECT ... FOR UPDATE` na linha de
 *     `contas_bancarias` correspondente para evitar race conditions em
 *     concorrência (dois clientes lançando saída simultânea na mesma conta).
 *   - Reutilizar o padrão já adotado em `transferencia_bancaria_atomica`.
 *   - Alternativa intermediária: `pg_advisory_xact_lock(hashtext(conta_id))`
 *     dentro de uma RPC sem alteração de schema.
 *   - Ação: abrir lote separado com migration dedicada; guards atuais em JS
 *     são best-effort e não substituem lock transacional.
 */

// [LOTE 3B] Hardening no service layer (sem migration).
const TIPOS_SAIDA: TipoMovimentacao[] = ['SAQUE', 'TRANSFERENCIA_SAIDA', 'AJUSTE_NEGATIVO'];

const validarValorPositivo = (valor: number): void => {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('VALOR_INVALIDO: O valor da movimentação deve ser maior que zero');
  }
};

const checarSaldoParaSaida = async (contaId: string, valor: number): Promise<void> => {
  // O filtro por empresa é obrigatório: era condicional, e sem empresa resolvida a validação
  // de saldo passava a olhar a conta de qualquer empresa.
  const empresaId = await getEmpresaAtivaIdOuFalha();
  const { data: conta, error } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual, status, configuracoes')
    .eq('id', contaId)
    .eq('empresa_representada_id', empresaId)
    .single();
  if (error) {
    throw new Error(`Erro ao validar conta: ${error.message}`);
  }
  if (conta?.status && conta.status !== 'ATIVA') {
    throw new BankingError('CONTA_INATIVA', 'Conta bancária não está ativa', { contaId });
  }
  const configuracoes = conta?.configuracoes as { permitir_saldo_negativo?: boolean } | null;
  const permitirNegativo = configuracoes?.permitir_saldo_negativo === true;
  const saldo = Number(conta?.saldo_atual ?? 0);
  if (!permitirNegativo && saldo < valor) {
    throw new BankingError(
      'SALDO_INSUFICIENTE',
      `Saldo (${saldo.toFixed(2)}) insuficiente para operação de ${valor.toFixed(2)}`,
      { contaId, saldo, valor }
    );
  }
};


// Função para listar movimentações com filtros
export const listarMovimentacoesBancarias = async (
  filtros?: FiltrosMovimentacoes
): Promise<MovimentacaoBancaria[]> => {

  const empresaId = await getEmpresaAtivaIdOuFalha();

  let query = supabase
    .from('movimentacoes_bancarias')
    .select(`
      *,
      conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!movimentacoes_bancarias_conta_destino_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
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
    .eq('empresa_representada_id', empresaId)
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

  return (data as unknown as MovimentacaoBancaria[]) || [];
};

// Função para obter uma movimentação específica
export const obterMovimentacaoBancaria = async (id: string): Promise<MovimentacaoBancaria | null> => {

  const empresaId = await getEmpresaAtivaIdOuFalha();

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .select(`
      *,
      conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!movimentacoes_bancarias_conta_destino_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
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
    .eq('empresa_representada_id', empresaId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[MovimentacoesBancarias] Erro ao obter movimentação:', error);
    throw new Error(`Erro ao obter movimentação: ${error.message}`);
  }

  return data as unknown as MovimentacaoBancaria;
};

// Função para criar uma nova movimentação
export const criarMovimentacaoBancaria = async (
  input: MovimentacaoBancariaInput
): Promise<MovimentacaoBancaria> => {
  // [LOTE 3B] Guards
  validarValorPositivo(input.valor);
  if (TIPOS_SAIDA.includes(input.tipo_movimentacao)) {
    await checarSaldoParaSaida(input.conta_bancaria_id, input.valor);
  }

  const empresaId = await getEmpresaAtivaIdOuFalha();

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .insert({
      ...input,
      empresa_representada_id: empresaId,
      tipo: input.tipo_movimentacao,
      data_lancamento: input.data_movimentacao,
      usuario_criacao_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select(`
      *,
      conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!movimentacoes_bancarias_conta_destino_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
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

  return data as unknown as MovimentacaoBancaria;
};

// Realiza transferência bancária de forma atômica via RPC do banco
export const realizarTransferenciaBancaria = async (
  transferencia: TransferenciaBancaria
): Promise<{ lote_id: string }> => {
  // [LOTE 3B] Guards pré-RPC
  validarValorPositivo(transferencia.valor);
  if (transferencia.conta_origem_id === transferencia.conta_destino_id) {
    throw new BankingError(
      'TRANSFERENCIA_INVALIDA',
      'Conta origem e destino não podem ser iguais',
      { origem: transferencia.conta_origem_id, destino: transferencia.conta_destino_id }
    );
  }
  const { data: contas, error: contasErr } = await supabase
    .from('contas_bancarias')
    .select('id, status, saldo_atual, configuracoes')
    .in('id', [transferencia.conta_origem_id, transferencia.conta_destino_id]);
  if (contasErr) {
    throw new BankingError('TRANSFERENCIA_INVALIDA', contasErr.message);
  }
  if (!contas || contas.length !== 2) {
    throw new BankingError('TRANSFERENCIA_INVALIDA', 'Contas de origem/destino não localizadas');
  }
  for (const c of contas) {
    if (c.status && c.status !== 'ATIVA') {
      throw new BankingError('TRANSFERENCIA_INVALIDA', 'Ambas as contas devem estar ativas', { contaId: c.id });
    }
  }
  const origem = contas.find((c) => c.id === transferencia.conta_origem_id);
  const origemConfiguracoes = origem?.configuracoes as { permitir_saldo_negativo?: boolean } | undefined;
  const permitirNegativo = origemConfiguracoes?.permitir_saldo_negativo === true;
  if (!permitirNegativo && Number(origem?.saldo_atual ?? 0) < transferencia.valor) {
    throw new BankingError('SALDO_INSUFICIENTE', 'Saldo insuficiente para transferência', {
      contaId: transferencia.conta_origem_id,
      saldo: Number(origem?.saldo_atual ?? 0),
      valor: transferencia.valor,
    });
  }

  // Obter empresa do usuário atual
  const empresaId = await getEmpresaAtivaIdOuFalha();

  const { data, error } = await supabase.rpc('transferencia_bancaria_atomica', {
    p_empresa_id: empresaId,
    p_conta_origem_id: transferencia.conta_origem_id,
    p_conta_destino_id: transferencia.conta_destino_id,
    p_valor: transferencia.valor,
    p_data_lancamento: transferencia.data_movimentacao,
    p_descricao: transferencia.descricao,
    p_lote_descricao: `Transferência: ${transferencia.descricao}`,
    // Campos opcionais fora de TransferenciaBancaria — nenhum chamador real os popula hoje
    // (TransferenciaModal.tsx não os usa), mantidos aqui por compatibilidade com a RPC.
    p_natureza_id: (transferencia as TransferenciaExtras).natureza_id ?? null,
    p_plano_conta_id: (transferencia as TransferenciaExtras).plano_conta_id ?? null,
    p_centro_custo_id: (transferencia as TransferenciaExtras).centro_custo_id ?? null,
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

  // [LOTE 3B] Idempotência: bloquear estorno duplicado explicitamente
  const { data: existing, error: exErr } = await supabase
    .from('movimentacoes_bancarias')
    .select('id, estornado, ativo')
    .eq('id', estorno.movimentacao_id)
    .maybeSingle();
  if (exErr) {
    throw new Error(`Erro ao localizar movimentação: ${exErr.message}`);
  }
  if (!existing) {
    throw new Error('ESTORNO_INVALIDO: Movimentação não encontrada');
  }
  if (existing.estornado) {
    throw new BankingError('ESTORNO_DUPLICADO', 'Movimentação já estornada', {
      movimentacaoId: estorno.movimentacao_id,
    });
  }

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
    .eq('estornado', false) // Guard-race adicional
    .select()
    .single();

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao estornar movimentação:', error);
    throw new Error(`Erro ao estornar movimentação: ${error.message}`);
  }

  return data as unknown as MovimentacaoBancaria;
};

// Função para conciliar movimentação
export const conciliarMovimentacao = async (
  conciliacao: ConciliacaoMovimentacao
): Promise<MovimentacaoBancaria> => {

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

  return data as unknown as MovimentacaoBancaria;
};

// Função para obter estatísticas
export const obterEstatisticasMovimentacoes = async (
  filtros?: FiltrosMovimentacoes
): Promise<EstatisticasMovimentacoes> => {

  const empresaId = await getEmpresaAtivaIdOuFalha();

  let query = supabase
    .from('movimentacoes_bancarias')
    .select('tipo_movimentacao, valor, estornado, conciliado')
    .eq('ativo', true)
    .eq('empresa_representada_id', empresaId);

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

// Obter trilha de auditoria via RPC segura (get_audit_trail)
export const obterHistoricoMovimentacao = async (
  movimentacaoId: string
): Promise<HistoricoMovimentacao[]> => {
  const { data, error } = await supabase.rpc('get_audit_trail', {
    p_movimentacao_id: movimentacaoId,
  });

  if (error) {
    console.error('[MovimentacoesBancarias] Erro ao obter histórico');
    throw new Error(`Erro ao obter histórico: ${error.message}`);
  }

  return (data as HistoricoMovimentacao[]) || [];
};

// Função para obter documentos de uma movimentação
export const obterDocumentosMovimentacao = async (
  movimentacaoId: string
): Promise<DocumentoMovimentacao[]> => {

  const empresaId = await getEmpresaAtivaIdOuFalha();

  const { data, error } = await supabase
    .from('documentos_movimentacoes_bancarias')
    .select('*')
    .eq('movimentacao_id', movimentacaoId)
    .eq('empresa_representada_id', empresaId)
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

  const { data, error } = await supabase
    .from('movimentacoes_bancarias')
    .update(input)
    .eq('id', id)
    .eq('estornado', false) // Só atualiza se não estiver estornado
    .select(`
      *,
      conta_bancaria:contas_bancarias!movimentacoes_bancarias_conta_bancaria_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
        agencia:agencias_bancarias (
          numero_agencia,
          banco:bancos (
            codigo,
            nome
          )
        )
      ),
      conta_destino:contas_bancarias!movimentacoes_bancarias_conta_destino_id_fkey (
        id,
        numero_conta,
        titular:nome_titular,
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

  return data as unknown as MovimentacaoBancaria;
};

// Função para excluir movimentação (soft delete)
export const excluirMovimentacaoBancaria = async (id: string): Promise<void> => {

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