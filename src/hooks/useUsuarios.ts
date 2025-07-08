
import { useState, useEffect } from 'react';
import { Usuario } from '@/types/empresa';
import { usuarioService } from '@/services/usuarioService';
import { usuarioUtils } from '@/utils/usuarioUtils';
import { useUsuarioErrorHandler } from '@/hooks/useUsuarioErrorHandler';

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const { handleError, handleValidationError, handleSuccess } = useUsuarioErrorHandler();

  const loadUsuarios = async () => {
    console.log('[Usuarios] Carregando lista de usuários...');
    setLoading(true);
    try {
      const data = await usuarioService.fetchUsuarios();
      const usuariosFormatados = data.map(usuarioUtils.transformSupabaseToUsuario);
      console.log('[Usuarios] Usuários carregados:', usuariosFormatados.length);
      setUsuarios(usuariosFormatados);
    } catch (error) {
      console.error('[Usuarios] Erro ao carregar usuários:', error);
      handleError(error, "Erro inesperado ao carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const saveUsuario = async (usuarioData: Usuario): Promise<boolean> => {
    console.log('[Usuarios] Salvando usuário:', usuarioData.nomeCompleto);
    setLoading(true);
    try {
      // Validar dados antes de salvar
      const validation = usuarioUtils.validateUsuarioData(usuarioData);
      if (!validation.isValid) {
        console.log('[Usuarios] Validação falhou:', validation.error);
        handleValidationError(validation.error!);
        setLoading(false);
        return false;
      }

      if (usuarioData.id) {
        // Atualizar usuário existente
        console.log('[Usuarios] Atualizando usuário existente ID:', usuarioData.id);
        await usuarioService.updateUsuario(usuarioData.id, usuarioData);
        handleSuccess("Usuário atualizado com sucesso!");
      } else {
        // Criar novo usuário
        console.log('[Usuarios] Criando novo usuário');
        await usuarioService.createUsuario(usuarioData);
        handleSuccess("Usuário criado com sucesso!");
      }

      // Recarregar lista
      await loadUsuarios();
      console.log('[Usuarios] Usuário salvo e lista recarregada');
      return true;
    } catch (error) {
      console.error('[Usuarios] Erro ao salvar usuário:', error);
      handleError(error, "Erro inesperado ao salvar os dados.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteUsuario = async (id: string): Promise<boolean> => {
    if (!id) {
      console.log('[Usuarios] ID não fornecido para exclusão');
      handleValidationError("ID do usuário é obrigatório para exclusão.");
      return false;
    }

    console.log('[Usuarios] Excluindo usuário ID:', id);
    setLoading(true);
    try {
      await usuarioService.deleteUsuario(id);
      await loadUsuarios();
      console.log('[Usuarios] Usuário excluído e lista recarregada');
      handleSuccess("Usuário excluído com sucesso!");
      return true;
    } catch (error) {
      console.error('[Usuarios] Erro ao excluir usuário:', error);
      handleError(error, "Erro inesperado ao excluir os dados.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
  }, []);

  return {
    usuarios,
    loading,
    saveUsuario,
    deleteUsuario,
    refetch: loadUsuarios
  };
};
