
import { Usuario } from '@/types/empresa';
import { SupabaseUsuario } from '@/services/usuarioService';

export const usuarioUtils = {
  transformSupabaseToUsuario(item: SupabaseUsuario): Usuario {
    return {
      id: item.id,
      empresaRepresentadaId: item.empresa_representada_id || '',
      nomeCompleto: item.nome_completo,
      cpf: item.cpf,
      email: item.email,
      perfilId: item.perfil_id,
      ativo: item.ativo || false,
      ultimoLogin: item.ultimo_login ? new Date(item.ultimo_login) : undefined,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    };
  },

  validateUsuarioData(usuarioData: Usuario): { isValid: boolean; error?: string } {
    if (!usuarioData.empresaRepresentadaId) {
      return { isValid: false, error: 'ID da empresa é obrigatório.' };
    }

    if (!usuarioData.perfilId) {
      return { isValid: false, error: 'ID do perfil é obrigatório.' };
    }

    return { isValid: true };
  },

  getErrorMessage(error: any): string {
    if (error.code === '23505') {
      return 'Já existe um usuário com este CPF ou email.';
    } else if (error.code === '23503') {
      return 'A empresa ou perfil selecionado não existe.';
    } else {
      return 'Não foi possível salvar os dados do usuário.';
    }
  }
};
