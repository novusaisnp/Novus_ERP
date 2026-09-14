
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { Agencia, AgenciaInput, AgenciaFilters, AgenciaStats } from '@/types/agencia';
import { getEmpresaAtivaIdOuFalha as getEmpresaIdAtual } from '@/lib/empresaAtiva';

console.log('[AgenciaService] Serviço de agências carregado');

// A tabela guarda numero_agencia/descricao (colunas restauradas em 20260725130000);
// o mapeamento existe para isolar o resto do service do formato bruto da linha.
const mapSupabaseAgencia = (data: Record<string, unknown>): Agencia => {
  const bancos = data.bancos as { id: string; codigo: string | null; nome: string; sigla: string | null } | null;
  return {
    id: data.id as string,
    banco_id: data.banco_id as string,
    numero_agencia: (data.numero_agencia as string | null) ?? '',
    descricao: (data.descricao as string | null) ?? '',
    endereco: (data.endereco as Agencia['endereco']) ?? {},
    telefone: (data.telefone as string | null) ?? undefined,
    ativo: Boolean(data.ativo),
    deleted_at: (data.deleted_at as string | null) ?? undefined,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    banco: bancos ? {
      id: bancos.id,
      codigo: bancos.codigo ?? '',
      nome: bancos.nome,
      sigla: bancos.sigla ?? undefined,
    } : undefined,
  };
};

export const listarAgencias = async (filtros?: AgenciaFilters): Promise<Agencia[]> => {
  console.log('[AgenciaService] Listando agências com filtros:', filtros);
  
  const empresaId = await getEmpresaIdAtual();
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
    `)
    .eq('empresa_representada_id', empresaId);

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
  return (data || []).map((row) => mapSupabaseAgencia(row as unknown as Record<string, unknown>));
};

export const criarAgencia = async (input: AgenciaInput): Promise<Agencia> => {
  console.log('[AgenciaService] Criando agência:', input);

  const empresaId = await getEmpresaIdAtual();

  // Verificar se o banco existe, pertence a esta empresa e está ativo
  const { data: banco, error: bancoError } = await supabase
    .from('bancos')
    .select('id, ativo')
    .eq('id', input.banco_id)
    .eq('empresa_representada_id', empresaId)
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
      empresa_representada_id: empresaId,
      banco_id: input.banco_id,
      numero: input.numero_agencia,
      numero_agencia: input.numero_agencia,
      descricao: input.descricao,
      endereco: (input.endereco || {}) as unknown as Json,
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
  return mapSupabaseAgencia(data as unknown as Record<string, unknown>);
};

export const atualizarAgencia = async (id: string, input: Partial<AgenciaInput>): Promise<Agencia> => {
  console.log('[AgenciaService] Atualizando agência:', id, input);

  const empresaId = await getEmpresaIdAtual();

  // Se banco_id foi alterado, verificar se está ativo e pertence a esta empresa
  if (input.banco_id) {
    const { data: banco, error: bancoError } = await supabase
      .from('bancos')
      .select('id, ativo')
      .eq('id', input.banco_id)
      .eq('empresa_representada_id', empresaId)
      .single();

    if (bancoError || !banco) {
      throw new Error('Banco não encontrado');
    }

    if (!banco.ativo) {
      throw new Error('Não é possível vincular agência a um banco inativo');
    }
  }

  const updateData: Database['public']['Tables']['agencias_bancarias']['Update'] = {};

  if (input.banco_id) updateData.banco_id = input.banco_id;
  if (input.numero_agencia) {
    updateData.numero_agencia = input.numero_agencia;
    updateData.numero = input.numero_agencia;
  }
  if (input.descricao) updateData.descricao = input.descricao;
  if (input.endereco !== undefined) updateData.endereco = input.endereco as unknown as Json;
  if (input.telefone !== undefined) updateData.telefone = input.telefone;
  if (input.ativo !== undefined) updateData.ativo = input.ativo;

  const { data, error } = await supabase
    .from('agencias_bancarias')
    .update(updateData)
    .eq('id', id)
    .eq('empresa_representada_id', empresaId)
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
  return mapSupabaseAgencia(data as unknown as Record<string, unknown>);
};

export const arquivarAgencia = async (id: string): Promise<void> => {
  console.log('[AgenciaService] Arquivando agência:', id);

  const empresaId = await getEmpresaIdAtual();
  const { error } = await supabase
    .from('agencias_bancarias')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);

  if (error) {
    console.error('[AgenciaService] Erro ao arquivar agência:', error);
    throw new Error(`Erro ao arquivar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência arquivada:', id);
};

export const restaurarAgencia = async (id: string): Promise<void> => {
  console.log('[AgenciaService] Restaurando agência:', id);

  const empresaId = await getEmpresaIdAtual();
  const { error } = await supabase
    .from('agencias_bancarias')
    .update({ deleted_at: null })
    .eq('id', id)
    .eq('empresa_representada_id', empresaId);

  if (error) {
    console.error('[AgenciaService] Erro ao restaurar agência:', error);
    throw new Error(`Erro ao restaurar agência: ${error.message}`);
  }

  console.log('[AgenciaService] Agência restaurada:', id);
};

export const obterEstatisticasAgencias = async (): Promise<AgenciaStats> => {
  console.log('[AgenciaService] Obtendo estatísticas das agências');

  const empresaId = await getEmpresaIdAtual();
  const { data, error } = await supabase
    .from('agencias_bancarias')
    .select('ativo, deleted_at')
    .eq('empresa_representada_id', empresaId);

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

  const empresaId = await getEmpresaIdAtual();
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
    .eq('empresa_representada_id', empresaId)
    .is('deleted_at', null)
    .order('numero_agencia');

  if (error) {
    console.error('[AgenciaService] Erro ao buscar agências por banco:', error);
    throw new Error(`Erro ao buscar agências: ${error.message}`);
  }

  console.log('[AgenciaService] Agências encontradas:', data?.length);
  return (data || []).map((row) => mapSupabaseAgencia(row as unknown as Record<string, unknown>));
};
