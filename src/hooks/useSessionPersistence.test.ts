import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionPersistence } from './useSessionPersistence';
import { markSessionActive } from '@/utils/sessionActivity';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('useSessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should logout when a stale session exists without rememberMe (browser reopened)', () => {
    const mockSignOut = vi.fn();
    const mockUser = { id: 'test-user', email: 'test@example.com' };

    localStorage.removeItem('novus_remember_me');
    // No markSessionActive() call: simulates a session persisted from a
    // previous, now-closed browser session — this is the case that must log out.

    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should NOT logout right after a fresh login without rememberMe (regression)', () => {
    const mockSignOut = vi.fn();
    const mockUser = { id: 'test-user', email: 'test@example.com' };

    localStorage.removeItem('novus_remember_me');
    // Login.tsx does a full page redirect after signIn(), remounting this hook.
    // markSessionActive() (called by signIn) must prevent the immediate logout.
    markSessionActive();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('should not logout when rememberMe is set to true', () => {
    const mockSignOut = vi.fn();
    const mockUser = { id: 'test-user', email: 'test@example.com' };

    localStorage.setItem('novus_remember_me', 'true');

    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('should not logout when no user is logged in', () => {
    const mockSignOut = vi.fn();

    localStorage.removeItem('novus_remember_me');

    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
