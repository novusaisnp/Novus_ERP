
import { supabase } from '@/integrations/supabase/client';

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
  colaborador_id?: string | null;
  socio_id?: string | null;
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
  pessoa_tipo: 'COLABORADOR' | 'SOCIO';
  pessoa_pendente: true;
  colaborador_id?: string;
  socio_id?: string;
  ativo: true;
  updated_at: string;
}

export const usuarioService = {
  async getEmpresaIdAtual(): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_user_empresa_id');
    if (error) throw error;
    return (data as string | null) ?? null;
  },

  /**
   * Lista enxuta de usuários ativos da empresa atual (RLS já escopa por tenant),
   * para selects de "responsável"/"vendedor" — não confundir com
   * fetchUsuariosComPessoa() (tela de administração, mais pesada).
   */
  async fetchUsuariosAtivos(): Promise<{ id: string; user_id: string; nome: string }[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, user_id, nome')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async listColaboradoresDisponiveis(): Promise<ColaboradorDisponivel[]> {
    const { data: colabs } = await supabase
      .from('colaboradores')
      .select('id, nome, cpf, email')
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome');
    const { data: usados } = await supabase
      .from('usuarios')
      .select('colaborador_id')
      .not('colaborador_id', 'is', null);
    const usedIds = new Set((usados ?? []).map((u) => u.colaborador_id));
    return (colabs ?? []).filter((c) => !usedIds.has(c.id));
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
   * Usado na tela de Configurações > Usuários (vínculo pessoa_tipo/colaborador_id/socio_id).
   */
  async fetchUsuariosComPessoa(): Promise<UsuarioComPessoa[]> {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, user_id, empresa_representada_id, ativo, nome, email, perfil_id, pessoa_tipo, pessoa_pendente, colaborador_id, socio_id');
    if (error) {
      console.error('[usuarioService] erro ao carregar usuários:', error);
      return [];
    }

    const colabIds = (usuarios ?? []).map((u) => u.colaborador_id).filter((v): v is string => !!v);
    const socioIds = (usuarios ?? []).map((u) => u.socio_id).filter((v): v is string => !!v);
    const colabMap: Record<string, string> = {};
    const socioMap: Record<string, string> = {};

    if (colabIds.length) {
      const { data } = await supabase.from('colaboradores').select('id, nome').in('id', colabIds);
      (data ?? []).forEach((c) => { colabMap[c.id] = c.nome; });
    }
    if (socioIds.length) {
      const { data } = await supabase.from('socios_representantes').select('id, nome').in('id', socioIds);
      (data ?? []).forEach((s) => { socioMap[s.id] = s.nome; });
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
      pessoa_nome: u.colaborador_id ? colabMap[u.colaborador_id] : u.socio_id ? socioMap[u.socio_id] : null,
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

    // Email: public.usuarios (case-insensitive)
    if (emailLower) {
      let q = supabase.from('usuarios').select('id').ilike('email', emailLower).limit(1);
      if (params.exceptId) q = q.neq('id', params.exceptId);
      const { data, error } = await q;
      if (error) throw error;
      result.email = (data || []).length > 0;
    }

    // CPF: tabela vinculada conforme pessoa_tipo
    if (cpfLimpo && params.pessoaTipo) {
      if (params.pessoaTipo === 'COLABORADOR') {
        let q = supabase.from('colaboradores').select('id').eq('cpf', cpfLimpo).limit(1);
        if (params.exceptPessoaId) q = q.neq('id', params.exceptPessoaId);
        const { data, error } = await q;
        if (error) throw error;
        result.cpfColaborador = (data || []).length > 0;
      } else {
        // SOCIO / REPRESENTANTE_LEGAL / PROCURADOR
        let q = supabase
          .from('socios_representantes')
          .select('id')
          .eq('cpf', cpfLimpo)
          .limit(1);
        if (params.exceptPessoaId) q = q.neq('id', params.exceptPessoaId);
        const { data, error } = await q;
        if (error) throw error;
        result.cpfSocio = (data || []).length > 0;
      }
    }

    return result;
  },
};
