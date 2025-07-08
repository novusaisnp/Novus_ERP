
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  }, []);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Clean up existing state first
      cleanupAuthState();
      
      // Try global sign out first to clear any stale sessions
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('[Auth] Global sign out failed (continuing)', err);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[Auth] Login error:', error.message);
        
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
        console.log('[Auth] Login successful for:', data.user.email);
        
        // Configure persistence for "remember me"
        if (rememberMe) {
          localStorage.setItem('novus_remember_me', 'true');
        } else {
          localStorage.removeItem('novus_remember_me');
        }
        
        return { };
      }

      return { error: 'Erro desconhecido no login' };
    } catch (error) {
      console.error('[Auth] Unexpected error:', error);
      return { error: 'Erro interno do sistema' };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [cleanupAuthState]);

  const signOut = useCallback(async () => {
    try {
      console.log('[Auth] Signing out');
      
      // Clean up first
      cleanupAuthState();
      localStorage.removeItem('novus_remember_me');
      
      // Then attempt global sign out
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload for a clean state
      window.location.href = '/login';
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      toast({
        title: 'Erro ao sair',
        description: 'Não foi possível encerrar a sessão corretamente',
        variant: 'destructive'
      });
    }
  }, [cleanupAuthState]);

  // Initialize auth state on component mount
  useEffect(() => {
    console.log('[Auth] Initializing auth state');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[Auth] Auth state changed:', event, session?.user?.email || 'no session');
        
        setState({
          session,
          user: session?.user ?? null,
          loading: false
        });
      }
    );
    
    // THEN get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Error getting initial session:', error);
        } else {
          console.log('[Auth] Initial session retrieved:', session?.user?.email || 'none');
          setState({
            session,
            user: session?.user ?? null,
            loading: false
          });
        }
      } catch (error) {
        console.error('[Auth] Unexpected error getting session:', error);
      }
    };

    getInitialSession();

    return () => {
      console.log('[Auth] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...state,
    signIn,
    signOut,
  };
}
