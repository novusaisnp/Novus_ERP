
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { SupabaseBanco, Banco, BancoInput, BancoBrasilAPI } from '@/types/banco';

const getEmpresaIdAtual = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Empresa não identificada para o usuário atual.');
  return data;
};

console.log('[Bancos] Service carregado');

// Transformar dados do Supabase para o formato da aplicação
const transformSupabaseBanco = (data: SupabaseBanco): Banco => ({
  id: data.id,
  codigo: data.codigo,
  nome: data.nome,
  sigla: data.sigla || '',
  pais: data.pais,
  ativo: data.ativo,
  deleted_at: data.deleted_at,
  created_at: data.created_at,
  updated_at: data.updated_at,
});

// Buscar bancos na BrasilAPI
export const buscarBancosBrasilAPI = async (): Promise<BancoBrasilAPI[]> => {
  try {
    console.log('[Bancos] Buscando bancos na BrasilAPI');
    const response = await fetch('https://brasilapi.com.br/api/banks/v1');
    
    if (!response.ok) {
      throw new Error('Erro ao buscar bancos na API');
    }
    
    const bancos = await response.json();
    console.log('[Bancos] Bancos encontrados na API:', bancos.length);
    return bancos;
  } catch (error) {
    console.error('[Bancos] Erro ao buscar bancos na API:', error);
    throw error;
  }
};

// Buscar banco específico por código na BrasilAPI
export const buscarBancoPorCodigo = async (codigo: string): Promise<BancoBrasilAPI | null> => {
  try {
    console.log('[Bancos] Buscando banco por código:', codigo);
    const bancos = await buscarBancosBrasilAPI();
    const codigoNum = Number(String(codigo).replace(/\D/g, ''));
    const banco = bancos.find(b => b.code != null && Number(b.code) === codigoNum);
    
    if (banco) {
      console.log('[Bancos] Banco encontrado:', banco);
    } else {
      console.log('[Bancos] Banco não encontrado para código:', codigo);
    }
    
    return banco || null;
  } catch (error) {
    console.error('[Bancos] Erro ao buscar banco por código:', error);
    return null;
  }
};

// Listar bancos (incluindo arquivados opcionalmente)
export const listarBancos = async (incluirArquivados = false): Promise<Banco[]> => {
  try {
    console.log('[Bancos] Listando bancos, incluir arquivados:', incluirArquivados);
    
    let query = supabase
      .from('bancos')
      .select('*')
      .order('nome');

    if (!incluirArquivados) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Bancos] Erro ao listar bancos:', error);
      throw error;
    }

    const bancos = data?.map(transformSupabaseBanco) || [];
    console.log('[Bancos] Bancos listados:', bancos.length);
    return bancos;
  } catch (error) {
    console.error('[Bancos] Erro ao listar bancos:', error);
    throw error;
  }
};

// Buscar bancos por filtros
export const buscarBancos = async (filtros: {
  codigo?: string;
  nome?: string;
  pais?: string;
  ativo?: boolean;
  incluirArquivados?: boolean;
}): Promise<Banco[]> => {
  try {
    console.log('[Bancos] Buscando bancos com filtros:', filtros);
    
    let query = supabase
      .from('bancos')
      .select('*');

    if (filtros.codigo) {
      query = query.ilike('codigo', `%${filtros.codigo}%`);
    }

    if (filtros.nome) {
      query = query.ilike('nome', `%${filtros.nome}%`);
    }

    if (filtros.pais) {
      query = query.ilike('pais', `%${filtros.pais}%`);
    }

    if (filtros.ativo !== undefined) {
      query = query.eq('ativo', filtros.ativo);
    }

    if (!filtros.incluirArquivados) {
      query = query.is('deleted_at', null);
    }

    query = query.order('nome');

    const { data, error } = await query;

    if (error) {
      console.error('[Bancos] Erro ao buscar bancos:', error);
      throw error;
    }

    const bancos = data?.map(transformSupabaseBanco) || [];
    console.log('[Bancos] Bancos encontrados:', bancos.length);
    return bancos;
  } catch (error) {
    console.error('[Bancos] Erro ao buscar bancos:', error);
    throw error;
  }
};

// Criar banco
export const criarBanco = async (input: BancoInput): Promise<Banco> => {
  try {
    console.log('[Bancos] Criando banco:', input);

    const empresaId = await getEmpresaIdAtual();

    const { data, error } = await supabase
      .from('bancos')
      .insert([{
        empresa_representada_id: empresaId,
        codigo: input.codigo,
        nome: input.nome,
        sigla: input.sigla || null,
        pais: input.pais,
        ativo: input.ativo,
      }])
      .select()
      .single();

    if (error) {
      console.error('[Bancos] Erro ao criar banco:', error);
      throw error;
    }

    const banco = transformSupabaseBanco(data);
    console.log('[Bancos] Banco criado:', banco);
    return banco;
  } catch (error) {
    console.error('[Bancos] Erro ao criar banco:', error);
    throw error;
  }
};

// Atualizar banco
export const atualizarBanco = async (id: string, input: Partial<BancoInput>): Promise<Banco> => {
  try {
    console.log('[Bancos] Atualizando banco:', id, input);

    const updateData: Database['public']['Tables']['bancos']['Update'] = {
      ...input,
      sigla: input.sigla || null,
    };

    const { data, error } = await supabase
      .from('bancos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Bancos] Erro ao atualizar banco:', error);
      throw error;
    }

    const banco = transformSupabaseBanco(data);
    console.log('[Bancos] Banco atualizado:', banco);
    return banco;
  } catch (error) {
    console.error('[Bancos] Erro ao atualizar banco:', error);
    throw error;
  }
};

// Arquivar banco (soft delete)
export const arquivarBanco = async (id: string): Promise<void> => {
  try {
    console.log('[Bancos] Arquivando banco:', id);

    const { error } = await supabase
      .from('bancos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[Bancos] Erro ao arquivar banco:', error);
      throw error;
    }

    console.log('[Bancos] Banco arquivado com sucesso');
  } catch (error) {
    console.error('[Bancos] Erro ao arquivar banco:', error);
    throw error;
  }
};

// Restaurar banco
export const restaurarBanco = async (id: string): Promise<void> => {
  try {
    console.log('[Bancos] Restaurando banco:', id);

    const { error } = await supabase
      .from('bancos')
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      console.error('[Bancos] Erro ao restaurar banco:', error);
      throw error;
    }

    console.log('[Bancos] Banco restaurado com sucesso');
  } catch (error) {
    console.error('[Bancos] Erro ao restaurar banco:', error);
    throw error;
  }
};

// Obter estatísticas dos bancos
export const obterEstatisticasBancos = async () => {
  try {
    console.log('[Bancos] Obtendo estatísticas dos bancos');

    const [totalResult, ativosResult, arquivadosResult] = await Promise.all([
      supabase.from('bancos').select('id', { count: 'exact' }),
      supabase.from('bancos').select('id', { count: 'exact' }).eq('ativo', true).is('deleted_at', null),
      supabase.from('bancos').select('id', { count: 'exact' }).not('deleted_at', 'is', null),
    ]);

    const stats = {
      total: totalResult.count || 0,
      ativos: ativosResult.count || 0,
      arquivados: arquivadosResult.count || 0,
      inativos: (totalResult.count || 0) - (ativosResult.count || 0) - (arquivadosResult.count || 0),
    };

    console.log('[Bancos] Estatísticas obtidas:', stats);
    return stats;
  } catch (error) {
    console.error('[Bancos] Erro ao obter estatísticas:', error);
    throw error;
  }
};
