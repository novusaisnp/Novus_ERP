import { useSessionPersistence } from '@/hooks/useSessionPersistence';

export function SessionPersistenceHandler() {
  useSessionPersistence();
  return null;
}
