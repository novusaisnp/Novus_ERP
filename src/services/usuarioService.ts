
import { supabase } from '@/integrations/supabase/client';
import { Usuario } from '@/types/empresa';

export interface SupabaseUsuario {
  id: string;
  empresa_representada_id: string | null;
  nome_completo: string;
  cpf: string;
  email: string;
  perfil_id: string;
  colaborador_id: string | null;
  ativo: boolean | null;
  ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

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

export const usuarioService = {
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
    }));
  },

  async toggleAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async atualizarPerfilUsuario(id: string, perfil_id: string | null): Promise<void> {
    const { error } = await supabase.from('usuarios').update({ perfil_id, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async fetchUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome_completo');

    if (error) {
      console.error('Erro ao carregar usuários:', error);
      throw new Error('Não foi possível carregar os usuários.');
    }

    return data || [];
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


  async createUsuario(usuarioData: Usuario) {
    const dataToSave = {
      empresa_representada_id: usuarioData.empresaRepresentadaId,
      nome_completo: usuarioData.nomeCompleto,
      cpf: usuarioData.cpf,
      email: usuarioData.email,
      perfil_id: usuarioData.perfilId,
      colaborador_id: usuarioData.colaboradorId || null,
      ativo: usuarioData.ativo,
      ultimo_login: usuarioData.ultimoLogin?.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('usuarios')
      .insert(dataToSave)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }

    return data;
  },

  async updateUsuario(id: string, usuarioData: Usuario) {
    const dataToSave = {
      empresa_representada_id: usuarioData.empresaRepresentadaId,
      nome_completo: usuarioData.nomeCompleto,
      cpf: usuarioData.cpf,
      email: usuarioData.email,
      perfil_id: usuarioData.perfilId,
      colaborador_id: usuarioData.colaboradorId || null,
      ativo: usuarioData.ativo,
      ultimo_login: usuarioData.ultimoLogin?.toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('usuarios')
      .update(dataToSave)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }

    return data;
  },

  async deleteUsuario(id: string) {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir usuário:', error);
      throw new Error('Não foi possível excluir o usuário.');
    }
  }
};
