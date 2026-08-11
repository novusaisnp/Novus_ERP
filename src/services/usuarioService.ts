
import { supabase } from '@/integrations/supabase/client';
import { getEmpresaAtivaId as getEmpresaIdAtual } from '@/lib/empresaAtiva';

export interface UsuarioComPessoa {
  id: string;
  user_id: string;
  empresa_representada_id: string | null;
  ativo: boolean | null;
  nome?: string | null;
  email?: string | null;
  perfil_id?: string | null;
  role?: string | null;
  pessoa_tipo?: 'COLABORADOR' | 'SOCIO' | null;
  pessoa_pendente?: boolean | null;
  entidade_id?: string | null;
  pessoa_nome?: string | null;
}

export interface ColaboradorDisponivel {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
}

export interface NovoUsuarioPendenteInput {
  empresa_representada_id: string;
  nome: string;
  email: string;
  perfil_id: string;
  pessoa_pendente: true;
  entidade_id: string;
  ativo: true;
  updated_at: string;
}

export const usuarioService = {
  getEmpresaIdAtual,

  /**
   * Nome cadastrado em public.usuarios para o usuário autenticado — fonte
   * mais confiável que auth.user_metadata.nome_completo, que fica vazio
   * quando a conta foi criada fora do fluxo de convite (ex. signup direto).
   */
  async fetchNomeUsuarioAtual(userId: string): Promise<string | null> {
    const empresaId = await getEmpresaIdAtual();
    let q = supabase.from('usuarios').select('nome').eq('user_id', userId);
    if (empresaId) q = q.eq('empresa_representada_id', empresaId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data?.nome ?? null;
  },

  /**
   * Lista enxuta de usuários ativos da empresa atual (RLS já escopa por tenant),
   * para selects de "responsável"/"vendedor" — não confundir com
   * fetchUsuariosComPessoa() (tela de administração, mais pesada).
   */
  async fetchUsuariosAtivos(): Promise<{ id: string; user_id: string; nome: string }[]> {
    const empresaId = await getEmpresaIdAtual();
    if (!empresaId) return [];
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, user_id, nome')
      .eq('ativo', true)
      .eq('empresa_representada_id', empresaId)
      .order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async listColaboradoresDisponiveis(): Promise<ColaboradorDisponivel[]> {
    const empresaId = await getEmpresaIdAtual();
    if (!empresaId) return [];
    const { data: colabs } = await supabase
      .from('entidades')
      .select('id, nome, cpf, email, entidade_papeis!inner(papel)')
      .eq('entidade_papeis.papel', 'COLABORADOR')
      .eq('ativo', true)
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('nome');
    const { data: usados } = await supabase
      .from('usuarios')
      .select('entidade_id')
      .eq('empresa_representada_id', empresaId)
      .not('entidade_id', 'is', null);
    const usedIds = new Set((usados ?? []).map((u) => u.entidade_id));
    return (colabs ?? []).filter((c) => !usedIds.has(c.id)).map(({ entidade_papeis: _omit, ...c }) => c);
  },

  async criarUsuarioPendente(payload: NovoUsuarioPendenteInput): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from('usuarios')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data;
  },

  async enviarConvite(params: { usuario_id?: string; email: string; nome: string }) {
    return supabase.functions.invoke('enviar-convite-usuario', { body: params });
  },

  /**
   * Lista usuários com o vínculo de pessoa (colaborador/sócio) e role resolvidos.
   * Usado na tela de Configurações > Usuários (vínculo entidade_id, tipo resolvido via papéis).
   */
  async fetchUsuariosComPessoa(): Promise<UsuarioComPessoa[]> {
    const empresaId = await getEmpresaIdAtual();
    if (!empresaId) return [];
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, user_id, empresa_representada_id, ativo, nome, email, perfil_id, pessoa_pendente, entidade_id')
      .eq('empresa_representada_id', empresaId);
    if (error) {
      console.error('[usuarioService] erro ao carregar usuários:', error);
      return [];
    }

    const entidadeIds = (usuarios ?? []).map((u) => u.entidade_id).filter((v): v is string => !!v);
    const entidadeMap: Record<string, { nome: string; tipo: 'COLABORADOR' | 'SOCIO' }> = {};

    if (entidadeIds.length) {
      const { data: entidades } = await supabase.from('entidades').select('id, nome').in('id', entidadeIds);
      const { data: papeis } = await supabase
        .from('entidade_papeis')
        .select('entidade_id, papel')
        .in('entidade_id', entidadeIds)
        .eq('ativo', true);
      const papeisByEntidade: Record<string, string[]> = {};
      (papeis ?? []).forEach((p) => { (papeisByEntidade[p.entidade_id] ??= []).push(p.papel); });
      (entidades ?? []).forEach((e) => {
        const tem = papeisByEntidade[e.id] ?? [];
        entidadeMap[e.id] = { nome: e.nome, tipo: tem.includes('COLABORADOR') ? 'COLABORADOR' : 'SOCIO' };
      });
    }

    const userIds = (usuarios ?? []).map((u) => u.user_id).filter((v): v is string => !!v);
    const roles: Record<string, string> = {};
    if (userIds.length) {
      const { data: rolesData } = await supabase.from('user_roles').select('user_id, role').in('user_id', userIds);
      (rolesData ?? []).forEach((r) => { roles[r.user_id] = r.role; });
    }

    return (usuarios ?? []).map((u) => ({
      ...u,
      role: roles[u.user_id] || '-',
      pessoa_tipo: u.entidade_id ? entidadeMap[u.entidade_id]?.tipo ?? null : null,
      pessoa_nome: u.entidade_id ? entidadeMap[u.entidade_id]?.nome ?? null : null,
    })) as unknown as UsuarioComPessoa[];
  },

  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async atualizarPerfilUsuario(id: string, perfil_id: string | null): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ perfil_id, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  /**
   * Vincula um usuário "legado" (pessoa_pendente=true, sem entidade_id)
   * a uma entidade já cadastrada, resolvendo a pendência da tela de Usuários.
   * `tipo` não é mais persistido — o papel da entidade já resolve isso.
   */
  async vincularPessoa(id: string, _tipo: 'COLABORADOR' | 'SOCIO', entidadeId: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({
        pessoa_pendente: false,
        entidade_id: entidadeId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Verifica duplicidade de CPF/email no banco (não apenas no array local).
   * Retorna { cpf?: boolean, email?: boolean } indicando quais campos já existem.
   */
  async checkDuplicidade(params: {
    cpf?: string;
    email?: string;
    exceptId?: string;
    pessoaTipo?: 'COLABORADOR' | 'SOCIO' | 'REPRESENTANTE_LEGAL' | 'PROCURADOR';
    exceptPessoaId?: string;
  }) {
    const result: {
      email: boolean;
      cpfColaborador: boolean;
      cpfSocio: boolean;
    } = { email: false, cpfColaborador: false, cpfSocio: false };

    const cpfLimpo = params.cpf ? params.cpf.replace(/\D/g, '') : '';
    const emailLower = params.email ? params.email.toLowerCase() : '';
    const empresaId = await getEmpresaIdAtual();

    // Email: public.usuarios (case-insensitive)
    if (emailLower) {
      let q = supabase.from('usuarios').select('id').ilike('email', emailLower).limit(1);
      if (empresaId) q = q.eq('empresa_representada_id', empresaId);
      if (params.exceptId) q = q.neq('id', params.exceptId);
      const { data, error } = await q;
      if (error) throw error;
      result.email = (data || []).length > 0;
    }

    // CPF: entidades filtradas pelo papel conforme pessoa_tipo
    if (cpfLimpo && params.pessoaTipo) {
      const papeis = params.pessoaTipo === 'COLABORADOR' ? ['COLABORADOR'] : ['SOCIO', 'REPRESENTANTE_LEGAL', 'PROCURADOR'];
      let q = supabase
        .from('entidades')
        .select('id, entidade_papeis!inner(papel)')
        .eq('cpf', cpfLimpo)
        .in('entidade_papeis.papel', papeis)
        .limit(1);
      if (empresaId) q = q.eq('empresa_representada_id', empresaId);
      if (params.exceptPessoaId) q = q.neq('id', params.exceptPessoaId);
      const { data, error } = await q;
      if (error) throw error;
      const found = (data || []).length > 0;
      if (params.pessoaTipo === 'COLABORADOR') result.cpfColaborador = found;
      else result.cpfSocio = found;
    }

    return result;
  },
};
