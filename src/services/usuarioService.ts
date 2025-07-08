
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
