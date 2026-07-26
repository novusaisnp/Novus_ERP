import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { ContaBancaria, ContaBancariaInput, ContaBancariaFilters, ContaBancariaEstatisticas } from '@/types/contaBancaria';

type ContaBancariaUpdate = Database['public']['Tables']['contas_bancarias']['Update'];

console.log('[ContaBancariaService] Serviço de contas bancárias carregado');

const CONTA_SELECT = `
  *,
  agencia:agencias_bancarias(
    numero_agencia,
    descricao,
    banco:bancos(
      codigo,
      nome
    )
  )
`;

// A tabela usa nome_titular/digito/descricao; a UI (anterior ao redesenho de
// Gestão Bancária) usa titular/digito_verificador/descricao_conta. Mapeamos aqui
// em vez de renomear a tela inteira.
const mapRowToConta = (row: Record<string, unknown>): ContaBancaria => ({
  id: row.id as string,
  agencia_id: row.agencia_id as string | null,
  numero_conta: row.numero_conta as string,
  digito_verificador: (row.digito as string | null) ?? '',
  tipo_conta: (row.tipo_conta as string | null) ?? '',
  titular: (row.nome_titular as string | null) ?? '',
  cpf_cnpj_titular: (row.cpf_cnpj_titular as string | null) ?? '',
  descricao_conta: row.descricao as string | null,
  saldo_inicial: Number(row.saldo_inicial ?? 0),
  saldo_atual: Number(row.saldo_atual ?? 0),
  limite_credito: row.limite_credito as number | null,
  limite_disponivel: null,
  data_abertura: row.data_abertura as string,
  data_encerramento: row.data_encerramento as string | null,
  status: row.status as string,
  conta_cofre: Boolean(row.conta_cofre),
  configuracoes: row.configuracoes as ContaBancaria['configuracoes'],
  observacoes: row.observacoes as string | null,
  ativo: Boolean(row.ativo),
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
  deleted_at: row.deleted_at as string | null,
  agencia: row.agencia as ContaBancaria['agencia'],
});

const getEmpresaIdAtual = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empresa não identificada para o usuário atual.');
  return data;
};

export const listarContasBancarias = async (filtros?: ContaBancariaFilters): Promise<ContaBancaria[]> => {
  console.log('[ContaBancariaService] Listando contas bancárias com filtros:', filtros);

  let query = supabase
    .from('contas_bancarias')
    .select(CONTA_SELECT)
    .order('created_at', { ascending: false });

  if (!filtros?.incluir_arquivadas) {
    query = query.is('deleted_at', null);
  }

  if (filtros?.numero_conta) {
    query = query.ilike('numero_conta', `%${filtros.numero_conta}%`);
  }

  if (filtros?.titular) {
    query = query.ilike('nome_titular', `%${filtros.titular}%`);
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
  return (data ?? []).map((row) => mapRowToConta(row as unknown as Record<string, unknown>));
};

export interface ContaBancariaOpcaoSelecao {
  id: string;
  descricao: string | null;
  numero_conta: string | null;
  nome_titular: string | null;
}

export const listarContasBancariasParaSelecao = async (): Promise<ContaBancariaOpcaoSelecao[]> => {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select('id, descricao, numero_conta, nome_titular')
    .is('deleted_at', null)
    .order('descricao');

  if (error) {
    console.error('[ContaBancariaService] Erro ao listar contas para seleção:', error);
    throw new Error(error.message);
  }

  return data ?? [];
};

export interface ContaBancariaComAgenciaBanco {
  id: string;
  cpf_cnpj_titular: string | null;
  numero_conta: string | null;
  digito: string | null;
  agencia_id: string | null;
  agencias_bancarias: {
    numero_agencia: string | null;
    bancos: { nome: string | null; codigo: string | null } | null;
  } | null;
}

export const listarContasBancariasAtivasComAgenciaBanco = async (): Promise<ContaBancariaComAgenciaBanco[]> => {
  const { data, error } = await supabase
    .from('contas_bancarias')
    .select(`
      id,
      cpf_cnpj_titular,
      numero_conta,
      digito,
      agencia_id,
      agencias_bancarias!inner(
        numero_agencia,
        bancos!inner(nome, codigo)
      )
    `)
    .eq('ativo', true);

  if (error) {
    console.error('[ContaBancariaService] Erro ao listar contas com agência/banco:', error);
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ContaBancariaComAgenciaBanco[];
};

export const criarContaBancaria = async (input: ContaBancariaInput): Promise<ContaBancaria> => {
  console.log('[ContaBancariaService] Criando conta bancária:', input);

  const empresaId = await getEmpresaIdAtual();

  const contaData = {
    empresa_representada_id: empresaId,
    numero_conta: input.numero_conta,
    digito: input.digito_verificador,
    tipo_conta: input.tipo_conta,
    nome_titular: input.titular,
    cpf_cnpj_titular: input.cpf_cnpj_titular,
    descricao: input.descricao_conta,
    saldo_inicial: input.saldo_inicial,
    saldo_atual: input.saldo_inicial,
    limite_credito: input.limite_credito,
    data_abertura: input.data_abertura,
    data_encerramento: input.data_encerramento,
    status: input.status || 'ATIVA',
    configuracoes: (input.configuracoes || {
      enviar_alertas: true,
      controlar_limite: true,
      permitir_saldo_negativo: false
    }) as unknown as Json,
    observacoes: input.observacoes,
    conta_cofre: input.conta_cofre,
    // Para contas cofre, agencia_id pode ser null
    agencia_id: input.conta_cofre ? null : input.agencia_id,
  };

  const { data, error } = await supabase
    .from('contas_bancarias')
    .insert(contaData)
    .select(CONTA_SELECT)
    .single();

  if (error) {
    console.error('[ContaBancariaService] Erro ao criar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária criada:', data.id);
  return mapRowToConta(data as unknown as Record<string, unknown>);
};

export const atualizarContaBancaria = async (id: string, input: Partial<ContaBancariaInput>): Promise<ContaBancaria> => {
  console.log('[ContaBancariaService] Atualizando conta bancária:', id, input);

  // [LOTE 3B] Guard de saldo_inicial (evita valor inválido antes de qualquer write)
  if (typeof input.saldo_inicial === 'number') {
    if (!Number.isFinite(input.saldo_inicial)) {
      throw new Error('SALDO_INICIAL_INVALIDO: valor não é um número finito');
    }
  }

  const updateData: ContaBancariaUpdate = {};
  if (input.numero_conta !== undefined) updateData.numero_conta = input.numero_conta;
  if (input.digito_verificador !== undefined) updateData.digito = input.digito_verificador;
  if (input.tipo_conta !== undefined) updateData.tipo_conta = input.tipo_conta;
  if (input.titular !== undefined) updateData.nome_titular = input.titular;
  if (input.cpf_cnpj_titular !== undefined) updateData.cpf_cnpj_titular = input.cpf_cnpj_titular;
  if (input.descricao_conta !== undefined) updateData.descricao = input.descricao_conta;
  if (input.saldo_inicial !== undefined) updateData.saldo_inicial = input.saldo_inicial;
  if (input.limite_credito !== undefined) updateData.limite_credito = input.limite_credito;
  if (input.data_abertura !== undefined) updateData.data_abertura = input.data_abertura;
  if (input.data_encerramento !== undefined) updateData.data_encerramento = input.data_encerramento;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.configuracoes !== undefined) updateData.configuracoes = input.configuracoes as unknown as Json;
  if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;
  if (input.conta_cofre !== undefined) updateData.conta_cofre = input.conta_cofre;

  // Ajustar agencia_id para contas cofre
  updateData.agencia_id = input.conta_cofre ? null : input.agencia_id;

  // Se saldo_inicial foi editado, ajustar saldo_atual pela diferença
  // (o trigger só recalcula quando há movimentação; ajuste manual não dispara)
  if (typeof input.saldo_inicial === 'number') {
    const { data: atual, error: readErr } = await supabase
      .from('contas_bancarias')
      .select('saldo_inicial, saldo_atual')
      .eq('id', id)
      .single();
    if (readErr) {
      console.error('[ContaBancariaService] Falha ao ler saldos anteriores:', readErr);
      throw new Error(readErr.message);
    }
    const oldInicial = Number(atual?.saldo_inicial ?? 0);
    const oldAtual = Number(atual?.saldo_atual ?? 0);
    const delta = Number(input.saldo_inicial) - oldInicial;
    if (delta !== 0) {
      updateData.saldo_atual = oldAtual + delta;
    }
  }

  // [LOTE 3B] Qualquer falha aqui propaga via throw — TanStack Query reverte
  // o cache; o componente não atualiza o state local (previne divergência).
  const { data, error } = await supabase
    .from('contas_bancarias')
    .update(updateData)
    .eq('id', id)
    .select(CONTA_SELECT)
    .single();

  if (error) {
    console.error('[ContaBancariaService] Erro ao atualizar conta bancária:', error);
    throw new Error(error.message);
  }

  console.log('[ContaBancariaService] Conta bancária atualizada:', data.id);
  return mapRowToConta(data as unknown as Record<string, unknown>);
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
