import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isSessionActive } from '@/utils/sessionActivity';

export function useSessionPersistence() {
  const { user, signOut } = useAuth();

  // On mount: if a session exists without rememberMe AND without the active-tab
  // marker, it's a stale session from a previous (closed) browser session — log out.
  useEffect(() => {
    const rememberMe = localStorage.getItem('novus_remember_me') === 'true';
    if (user && !rememberMe && !isSessionActive()) {
      signOut();
    }
  }, [user, signOut]);
}
