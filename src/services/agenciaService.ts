
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { Agencia, AgenciaInput, AgenciaFilters, AgenciaStats, SupabaseAgencia } from '@/types/agencia';

console.log('[AgenciaService] Serviço de agências carregado');

const mapSupabaseAgencia = (data: SupabaseAgencia): Agencia => ({
  id: data.id,
  banco_id: data.banco_id,
  numero_agencia: data.numero_agencia,
  descricao: data.descricao,
  endereco: data.endereco || {},
  telefone: data.telefone || undefined,
  ativo: data.ativo,
  deleted_at: data.deleted_at || undefined,
  created_at: data.created_at,
  updated_at: data.updated_at,
  banco: data.bancos ? {
    id: data.bancos.id,
    codigo: data.bancos.codigo,
    nome: data.bancos.nome,
    sigla: data.bancos.sigla || undefined,
  } : undefined,
});

export const listarAgencias = async (filtros?: AgenciaFilters): Promise<Agencia[]> => {
  console.log('[AgenciaService] Listando agências com filtros:', filtros);
  
  let query = supabase
    .from('agencias_bancarias')
    .select(`
      *,
      bancos:banco_id (
        id,
        codigo,
        nome,
        sigla
      )
    `);

  // Aplicar filtros
  if (filtros?.banco_id) {
    query = query.eq('banco_id', filtros.banco_id);
  }

  if (filtros?.numero_agencia) {
    query = query.ilike('numero_agencia', `%${filtros.numero_agencia}%`);
  }

  if (filtros?.ativo !== undefined) {
    query = query.eq('ativo', filtros.ativo);
  }

  if (!filtros?.incluirArquivadas) {
    query = query.is('deleted_at', null);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('[AgenciaService] Erro ao listar agências:', error);
    throw new Error(`Erro ao carregar agências: ${error.message}`);
  }

  console.log('[AgenciaService] Agências carregadas:', data?.length);
  return (data || []).map(mapSupabaseAgencia);
};

export const criarAgencia = async (input: AgenciaInput): Promise<Agencia> => {
  console.log('[AgenciaService] Criando agência:', input);

  // Verificar se o banco existe e está ativo
  const { data: banco, error: bancoError } = await supabase
    .from('bancos')
    .select('id, ativo')
    .eq('id', input.banco_id)
    .single();

  if (bancoError || !banco) {
    throw new Error('Banco não encontrado');
  }

  if (!banco.ativo) {
    throw new Error('Não é possível vincular agência a um banco inativo');
  }

  const { data, error } = await supabase
    .from('agencias_bancarias')
    .insert({
      banco_id: input.banco_id,
      numero_agencia: input.numero_agencia,
      descricao: input.descricao,
      endereco: input.endereco || {},
      telefone: input.telefone,
      ativo: input.ativo !== undefined ? input.ativo : true,
    })
    .select(`
      *,
      bancos:banco_id (
        id,
        codigo,
        nome,
        sigla
      )
    `)
    .single();

  if (error) {
    console.error('[AgenciaService] Erro ao criar agência:', error);
    if (error.code === '23505') {
      throw new Error('Já existe uma agência com este número para o banco selecionado');
    }
    throw new Error(`Erro ao criar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência criada:', data.id);
  return mapSupabaseAgencia(data);
};

export const atualizarAgencia = async (id: string, input: Partial<AgenciaInput>): Promise<Agencia> => {
  console.log('[AgenciaService] Atualizando agência:', id, input);

  // Se banco_id foi alterado, verificar se está ativo
  if (input.banco_id) {
    const { data: banco, error: bancoError } = await supabase
      .from('bancos')
      .select('id, ativo')
      .eq('id', input.banco_id)
      .single();

    if (bancoError || !banco) {
      throw new Error('Banco não encontrado');
    }

    if (!banco.ativo) {
      throw new Error('Não é possível vincular agência a um banco inativo');
    }
  }

  const updateData: any = {};
  
  if (input.banco_id) updateData.banco_id = input.banco_id;
  if (input.numero_agencia) updateData.numero_agencia = input.numero_agencia;
  if (input.descricao) updateData.descricao = input.descricao;
  if (input.endereco !== undefined) updateData.endereco = input.endereco;
  if (input.telefone !== undefined) updateData.telefone = input.telefone;
  if (input.ativo !== undefined) updateData.ativo = input.ativo;

  const { data, error } = await supabase
    .from('agencias_bancarias')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      bancos:banco_id (
        id,
        codigo,
        nome,
        sigla
      )
    `)
    .single();

  if (error) {
    console.error('[AgenciaService] Erro ao atualizar agência:', error);
    if (error.code === '23505') {
      throw new Error('Já existe uma agência com este número para o banco selecionado');
    }
    throw new Error(`Erro ao atualizar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência atualizada:', data.id);
  return mapSupabaseAgencia(data);
};

export const arquivarAgencia = async (id: string): Promise<void> => {
  console.log('[AgenciaService] Arquivando agência:', id);

  const { error } = await supabase
    .from('agencias_bancarias')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[AgenciaService] Erro ao arquivar agência:', error);
    throw new Error(`Erro ao arquivar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência arquivada:', id);
};

export const restaurarAgencia = async (id: string): Promise<void> => {
  console.log('[AgenciaService] Restaurando agência:', id);

  const { error } = await supabase
    .from('agencias_bancarias')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) {
    console.error('[AgenciaService] Erro ao restaurar agência:', error);
    throw new Error(`Erro ao restaurar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência restaurada:', id);
};

export const obterEstatisticasAgencias = async (): Promise<AgenciaStats> => {
  console.log('[AgenciaService] Obtendo estatísticas das agências');

  const { data, error } = await supabase
    .from('agencias_bancarias')
    .select('ativo, deleted_at');

  if (error) {
    console.error('[AgenciaService] Erro ao obter estatísticas:', error);
    throw new Error(`Erro ao carregar estatísticas: ${error.message}`);
  }

  const stats = {
    total: data?.length || 0,
    ativas: data?.filter(a => a.ativo && !a.deleted_at).length || 0,
    inativas: data?.filter(a => !a.ativo && !a.deleted_at).length || 0,
    arquivadas: data?.filter(a => a.deleted_at).length || 0,
  };

  console.log('[AgenciaService] Estatísticas:', stats);
  return stats;
};

export const buscarAgenciasPorBanco = async (bancoId: string): Promise<Agencia[]> => {
  console.log('[AgenciaService] Buscando agências por banco:', bancoId);

  const { data, error } = await supabase
    .from('agencias_bancarias')
    .select(`
      *,
      bancos:banco_id (
        id,
        codigo,
        nome,
        sigla
      )
    `)
    .eq('banco_id', bancoId)
    .is('deleted_at', null)
    .order('numero_agencia');

  if (error) {
    console.error('[AgenciaService] Erro ao buscar agências por banco:', error);
    throw new Error(`Erro ao buscar agências: ${error.message}`);
  }

  console.log('[AgenciaService] Agências encontradas:', data?.length);
  return (data || []).map(mapSupabaseAgencia);
};
