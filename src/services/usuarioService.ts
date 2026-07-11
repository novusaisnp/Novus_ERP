
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
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

export const usuarioService = {
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
  async checkDuplicidade(params: { cpf?: string; email?: string; exceptId?: string }) {
    const result: { cpf: boolean; email: boolean } = { cpf: false, email: false };
    const cpfLimpo = params.cpf ? params.cpf.replace(/\D/g, '') : '';
    const emailLower = params.email ? params.email.toLowerCase() : '';

    if (cpfLimpo) {
      let q = supabase.from('usuarios').select('id').eq('cpf', cpfLimpo).limit(1);
      if (params.exceptId) q = q.neq('id', params.exceptId);
      const { data, error } = await q;
      if (error) throw error;
      result.cpf = (data || []).length > 0;
    }

    if (emailLower) {
      let q = supabase.from('usuarios').select('id').ilike('email', emailLower).limit(1);
      if (params.exceptId) q = q.neq('id', params.exceptId);
      const { data, error } = await q;
      if (error) throw error;
      result.email = (data || []).length > 0;
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
