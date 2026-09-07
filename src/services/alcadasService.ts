import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';
import type { Json } from '@/integrations/supabase/types';
import type {
  AlcadaAprovacao,
  AlcadaAprovacaoInput,
  AlcadaSubstituto,
  AlcadaSubstitutoInput,
  DecidirSolicitacaoResultado,
  SolicitacaoAprovacao,
  SolicitarAprovacaoInput,
  SolicitarAprovacaoResultado,
} from '@/types/alcadas';

/**
 * Nunca deixar código/SQLSTATE cru chegar ao usuário ("erro em aramaico") — todo
 * erro que pode acontecer em uso normal (não só em teste) precisa de tradução
 * explícita aqui. `fkMessage` cobre o 23503 (violação de FK) de forma específica
 * por chamada, já que a mesma violação genérica do Postgres significa coisas
 * diferentes dependendo de qual tabela/relação disparou.
 */
function translateError(
  error: { code?: string; message?: string } | null,
  fallback: string,
  fkMessage?: string
): Error {
  const code = error?.code;
  const msg = error?.message || '';
  if (code === '42501' || /row-level security|permission|access denied/i.test(msg)) {
    return new Error('Você não tem permissão para esta operação.');
  }
  if (code === '23503') {
    return new Error(fkMessage || 'Este registro já foi usado em outro lugar do sistema e não pode ser removido.');
  }
  if (code === '23505') {
    return new Error('Já existe uma alçada cadastrada para essa categoria a partir desse valor.');
  }
  if (msg.startsWith('SEGREGACAO_FUNCOES')) {
    return new Error('Quem solicitou não pode aprovar/rejeitar a própria solicitação.');
  }
  if (msg.startsWith('PERMISSAO_INSUFICIENTE')) {
    return new Error('Você não tem a alçada necessária para decidir esta solicitação.');
  }
  if (msg.startsWith('JUSTIFICATIVA_OBRIGATORIA')) {
    return new Error('Justificativa é obrigatória para rejeitar.');
  }
  if (msg.startsWith('SOLICITACAO_JA_DECIDIDA')) {
    return new Error('Esta solicitação já foi decidida.');
  }
  if (msg.startsWith('SOLICITACAO_NAO_ENCONTRADA')) {
    return new Error('Solicitação não encontrada — pode já ter sido removida.');
  }
  if (msg.startsWith('VALOR_INVALIDO')) {
    return new Error('Informe um valor válido (maior ou igual a zero).');
  }
  if (msg.startsWith('CATEGORIA_OBRIGATORIA')) {
    return new Error('A categoria é obrigatória.');
  }
  if (msg.startsWith('DESCRICAO_OBRIGATORIA')) {
    return new Error('A descrição é obrigatória.');
  }
  if (msg.startsWith('DECISAO_INVALIDA')) {
    return new Error('Decisão inválida — só é possível aprovar ou rejeitar.');
  }
  return new Error(`${fallback}: ${msg || 'erro desconhecido'}`);
}

export const alcadasAprovacaoService = {
  async list(): Promise<AlcadaAprovacao[]> {
    const { data, error } = await supabase
      .from('alcadas_aprovacao')
      .select('*')
      .order('categoria')
      .order('valor_minimo');
    if (error) throw translateError(error, 'Erro ao buscar alçadas');
    return (data || []) as AlcadaAprovacao[];
  },

  async create(input: AlcadaAprovacaoInput): Promise<AlcadaAprovacao> {
    const empresa_representada_id = await getEmpresaId();
    const { data, error } = await supabase
      .from('alcadas_aprovacao')
      .insert([{
        empresa_representada_id,
        categoria: input.categoria.trim(),
        valor_minimo: input.valor_minimo,
        permissao_necessaria: input.permissao_necessaria,
        descricao: input.descricao?.trim() || null,
        ativo: input.ativo ?? true,
      }])
      .select()
      .single();
    if (error) throw translateError(error, 'Erro ao cadastrar alçada');
    return data as AlcadaAprovacao;
  },

  async update(id: string, input: Partial<AlcadaAprovacaoInput>): Promise<AlcadaAprovacao> {
    const { data, error } = await supabase
      .from('alcadas_aprovacao')
      .update({
        ...(input.categoria !== undefined && { categoria: input.categoria.trim() }),
        ...(input.valor_minimo !== undefined && { valor_minimo: input.valor_minimo }),
        ...(input.permissao_necessaria !== undefined && { permissao_necessaria: input.permissao_necessaria }),
        ...(input.descricao !== undefined && { descricao: input.descricao?.trim() || null }),
        ...(input.ativo !== undefined && { ativo: input.ativo }),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw translateError(error, 'Erro ao atualizar alçada');
    return data as AlcadaAprovacao;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('alcadas_aprovacao').delete().eq('id', id);
    if (error) throw translateError(
      error,
      'Erro ao remover alçada',
      'Esta alçada já foi usada em solicitações e não pode ser removida — desative-a em vez de excluir.'
    );
  },
};

export const alcadasSubstitutosService = {
  async list(): Promise<AlcadaSubstituto[]> {
    const { data, error } = await supabase
      .from('alcadas_substitutos')
      .select('*')
      .order('data_inicio', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar substituições');
    return (data || []) as AlcadaSubstituto[];
  },

  async create(input: AlcadaSubstitutoInput): Promise<AlcadaSubstituto> {
    const empresa_representada_id = await getEmpresaId();
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('alcadas_substitutos')
      .insert([{
        empresa_representada_id,
        aprovador_titular_id: input.aprovador_titular_id,
        aprovador_substituto_id: input.aprovador_substituto_id,
        categoria: input.categoria?.trim() || null,
        data_inicio: input.data_inicio,
        data_fim: input.data_fim,
        motivo: input.motivo.trim(),
        criado_por: userData.user?.id,
      }])
      .select()
      .single();
    if (error) throw translateError(error, 'Erro ao registrar substituição');
    return data as AlcadaSubstituto;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('alcadas_substitutos').delete().eq('id', id);
    if (error) throw translateError(
      error,
      'Erro ao remover substituição',
      'Esta substituição já foi usada para decidir uma solicitação e não pode ser removida.'
    );
  },
};

export const solicitacoesAprovacaoService = {
  async list(): Promise<SolicitacaoAprovacao[]> {
    const { data, error } = await supabase
      .from('solicitacoes_aprovacao')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw translateError(error, 'Erro ao buscar solicitações');
    return (data || []) as unknown as SolicitacaoAprovacao[];
  },

  async solicitar(input: SolicitarAprovacaoInput): Promise<SolicitarAprovacaoResultado> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase.rpc('solicitar_aprovacao', {
      p_empresa_id: empresaId,
      p_categoria: input.categoria.trim(),
      p_valor: input.valor,
      p_descricao: input.descricao.trim(),
      p_contexto: (input.contexto ?? null) as unknown as Json,
      p_origem_tabela: input.origem_tabela ?? null,
      p_origem_id: input.origem_id ?? null,
    });
    if (error) throw translateError(error, 'Erro ao abrir solicitação de aprovação');
    return data as unknown as SolicitarAprovacaoResultado;
  },

  async decidir(id: string, decisao: 'APROVADO' | 'REJEITADO', justificativa?: string): Promise<DecidirSolicitacaoResultado> {
    const { data, error } = await supabase.rpc('decidir_solicitacao', {
      p_solicitacao_id: id,
      p_decisao: decisao,
      p_justificativa: justificativa || null,
    });
    if (error) throw translateError(error, 'Erro ao decidir solicitação');
    return data as unknown as DecidirSolicitacaoResultado;
  },

  async cancelar(id: string): Promise<DecidirSolicitacaoResultado> {
    const { data, error } = await supabase.rpc('cancelar_solicitacao_aprovacao', {
      p_solicitacao_id: id,
    });
    if (error) throw translateError(error, 'Erro ao cancelar solicitação');
    return data as unknown as DecidirSolicitacaoResultado;
  },
};
