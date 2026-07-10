
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;

export const createTestUser = async (email: string, password: string) => {
  try {
    console.log('[AuthUtils] Criando usuário de teste:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    if (error) {
      console.error('[AuthUtils] Erro ao criar usuário:', error.message);
      throw error;
    }

    console.log('[AuthUtils] Usuário criado com sucesso:', data.user?.email);
    return { user: data.user, error: null };
  } catch (error) {
    console.error('[AuthUtils] Erro inesperado:', error);
    return { user: null, error: error as Error };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    
    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
};
