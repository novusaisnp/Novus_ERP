import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
  toast: toastFn,
}));

vi.mock('@/services/clienteService', () => ({
  clienteService: {
    fetchClientes: vi.fn(),
    createCliente: vi.fn(),
    updateCliente: vi.fn(),
    deleteCliente: vi.fn(),
  },
}));

import { useClientes } from './useClientes';
import { clienteService } from '@/services/clienteService';

const svc = clienteService as any;

const supabaseRow = {
  id: 'c1',
  nome: 'ACME',
  tipo: 'J',
  cpf_cnpj: '11222333000181',
  ativo: true,
  created_at: '2024-01-01T00:00:00Z',
  emails: ['a@a.com'],
  telefones: ['11'],
};

beforeEach(() => {
  toastFn.mockReset();
  Object.values(svc).forEach((f: any) => f.mockReset());
});

describe('useClientes.loadClientes', () => {
  it('carrega e transforma clientes', async () => {
    svc.fetchClientes.mockResolvedValue([supabaseRow]);
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.clientes).toHaveLength(1);
    expect(result.current.clientes[0].nome).toBe('ACME');
    expect(result.current.clientes[0].tipo).toBe('J');
  });

  it('exibe toast de erro em falha', async () => {
    svc.fetchClientes.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useClientes.saveCliente', () => {
  it('bloqueia insert quando validação falha', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveCliente({ nome: '', tipo: 'F' } as any);
    });
    expect(ok).toBe(false);
    expect(svc.createCliente).not.toHaveBeenCalled();
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro de validação' }));
  });

  it('cria cliente novo e recarrega', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    svc.createCliente.mockResolvedValue({ id: 'new' });
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveCliente({
        nome: 'Novo',
        tipo: 'F',
        emails: [],
        telefones: [],
      } as any);
    });
    expect(ok).toBe(true);
    expect(svc.createCliente).toHaveBeenCalled();
    expect(svc.fetchClientes).toHaveBeenCalledTimes(2);
  });

  it('atualiza cliente existente', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    svc.updateCliente.mockResolvedValue({ id: 'c1' });
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveCliente({
        id: 'c1',
        nome: 'Edit',
        tipo: 'F',
        emails: [],
        telefones: [],
      } as any);
    });
    expect(ok).toBe(true);
    expect(svc.updateCliente).toHaveBeenCalledWith('c1', expect.any(Object), 'empresa-1');
  });

  it('propaga erro do service com toast', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    svc.createCliente.mockRejectedValue({ code: '23505' });
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveCliente({
        nome: 'X',
        tipo: 'F',
        emails: [],
        telefones: [],
      } as any);
    });
    expect(ok).toBe(false);
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useClientes.deleteCliente', () => {
  it('valida id vazio', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteCliente('');
    });
    expect(ok).toBe(false);
    expect(svc.deleteCliente).not.toHaveBeenCalled();
  });

  it('exclui e recarrega', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    svc.deleteCliente.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteCliente('c1');
    });
    expect(ok).toBe(true);
    expect(svc.deleteCliente).toHaveBeenCalledWith('c1', 'empresa-1');
    expect(svc.fetchClientes).toHaveBeenCalledTimes(2);
  });

  it('propaga erro do service', async () => {
    svc.fetchClientes.mockResolvedValue([]);
    svc.deleteCliente.mockRejectedValue(new Error('FK'));
    const { result } = renderHook(() => useClientes('empresa-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteCliente('c1');
    });
    expect(ok).toBe(false);
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});
