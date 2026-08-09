import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useSessionPersistence() {
  const { user, signOut } = useAuth();

  // On mount: if user is logged in but rememberMe is not set, logout immediately
  // This handles page reloads where session persisted but shouldn't have
  useEffect(() => {
    const rememberMe = localStorage.getItem('novus_remember_me') === 'true';
    if (user && !rememberMe) {
      signOut();
    }
  }, [user, signOut]);

  // On beforeunload: clean auth tokens if rememberMe is false
  // This ensures session doesn't persist when user closes tab/browser
  useEffect(() => {
    const handleBeforeUnload = () => {
      const rememberMe = localStorage.getItem('novus_remember_me') === 'true';
      if (!rememberMe) {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('supabase.auth.') || key.includes('sb-') || key === 'supabase.auth.token') {
            localStorage.removeItem(key);
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
