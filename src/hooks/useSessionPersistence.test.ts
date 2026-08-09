import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSessionPersistence } from './useSessionPersistence';
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

  it('should logout when user is logged in without rememberMe', () => {
    const mockSignOut = vi.fn();
    const mockUser = { id: 'test-user', email: 'test@example.com' };

    localStorage.removeItem('novus_remember_me');

    (useAuth as any).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    expect(mockSignOut).toHaveBeenCalled();
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

  it('should clean auth tokens on beforeunload when rememberMe is false', () => {
    const mockSignOut = vi.fn();

    localStorage.removeItem('novus_remember_me');
    localStorage.setItem('supabase.auth.token', 'test-token');
    localStorage.setItem('sb-test-key', 'test-value');

    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    // Trigger beforeunload event
    window.dispatchEvent(new Event('beforeunload'));

    expect(localStorage.getItem('supabase.auth.token')).toBeNull();
    expect(localStorage.getItem('sb-test-key')).toBeNull();
  });

  it('should not clean auth tokens on beforeunload when rememberMe is true', () => {
    const mockSignOut = vi.fn();

    localStorage.setItem('novus_remember_me', 'true');
    localStorage.setItem('supabase.auth.token', 'test-token');

    (useAuth as any).mockReturnValue({
      user: null,
      signOut: mockSignOut,
    });

    renderHook(() => useSessionPersistence());

    // Trigger beforeunload event
    window.dispatchEvent(new Event('beforeunload'));

    expect(localStorage.getItem('supabase.auth.token')).toBe('test-token');
  });
});
