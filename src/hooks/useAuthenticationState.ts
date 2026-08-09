import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { markSessionActive } from '@/utils/sessionActivity';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuthenticationState() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  // Clean up auth state helper to prevent authentication limbo
  const cleanupAuthState = useCallback(() => {
    localStorage.removeItem('supabase.auth.token');

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      try {
        setState((prev) => ({ ...prev, loading: true }));

        cleanupAuthState();

        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch {
          // Continue even if this fails
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          let errorMessage = 'Email ou senha incorretos';
          if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Email ou senha incorretos';
          } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada';
          } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos';
          }
          return { error: errorMessage };
        }

        if (data.user) {
          if (rememberMe) {
            localStorage.setItem('novus_remember_me', 'true');
          } else {
            localStorage.removeItem('novus_remember_me');
          }
          // Marks this tab as the origin of the login, so the post-login
          // redirect doesn't get bounced by useSessionPersistence's stale-session check.
          markSessionActive();
          return {};
        }

        return { error: 'Erro desconhecido no login' };
      } catch {
        return { error: 'Erro interno do sistema' };
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [cleanupAuthState]
  );

  const signOut = useCallback(async () => {
    try {
      cleanupAuthState();
      localStorage.removeItem('novus_remember_me');
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/login';
    } catch {
      toast({
        title: 'Erro ao sair',
        description: 'Não foi possível encerrar a sessão corretamente',
        variant: 'destructive',
      });
    }
  }, [cleanupAuthState]);

  useEffect(() => {
    // onAuthStateChange fires an INITIAL_SESSION event immediately on
    // subscribe with the current session — a separate getSession() call
    // duplicates that work and causes a second, near-simultaneous render
    // (visible as a flash/jank right after login).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        session,
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    signIn,
    signOut,
  };
}
