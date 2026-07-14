import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
  toast: toastFn,
}));

vi.mock('@/services/fornecedorService', () => ({
  fornecedorService: {
    fetchFornecedores: vi.fn(),
    createFornecedor: vi.fn(),
    updateFornecedor: vi.fn(),
    deleteFornecedor: vi.fn(),
  },
}));

import { useFornecedores } from './useFornecedores';
import { fornecedorService } from '@/services/fornecedorService';

const svc = fornecedorService as any;

const rowPJ = {
  id: 'f1',
  tipo_pessoa: 'PJ',
  razao_social: 'ACME',
  cnpj: '11222333000181',
  ativo: true,
  created_at: '2024-01-01',
};

beforeEach(() => {
  toastFn.mockReset();
  Object.values(svc).forEach((f: any) => f.mockReset());
});

describe('useFornecedores load', () => {
  it('carrega e transforma', async () => {
    svc.fetchFornecedores.mockResolvedValue([rowPJ]);
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fornecedores).toHaveLength(1);
    expect(result.current.fornecedores[0].razaoSocial).toBe('ACME');
  });

  it('toast em erro', async () => {
    svc.fetchFornecedores.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useFornecedores save', () => {
  it('valida e bloqueia insert', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveFornecedor({ tipo_pessoa: 'PJ' } as any);
    });
    expect(ok).toBe(false);
    expect(svc.createFornecedor).not.toHaveBeenCalled();
  });

  it('cria PJ válido', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    svc.createFornecedor.mockResolvedValue({ id: 'new' });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveFornecedor({
        tipo_pessoa: 'PJ',
        razaoSocial: 'ACME',
        cnpj: '11222333000181',
      } as any);
    });
    expect(ok).toBe(true);
    expect(svc.createFornecedor).toHaveBeenCalled();
  });

  it('atualiza existente', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    svc.updateFornecedor.mockResolvedValue({ id: 'f1' });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveFornecedor({
        id: 'f1',
        tipo_pessoa: 'PJ',
        razaoSocial: 'ACME',
        cnpj: '11222333000181',
      } as any);
    });
    expect(svc.updateFornecedor).toHaveBeenCalledWith('f1', expect.any(Object));
  });

  it('propaga erro do service', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    svc.createFornecedor.mockRejectedValue({ code: '23505', message: 'dup cnpj' });
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.saveFornecedor({
        tipo_pessoa: 'PJ',
        razaoSocial: 'ACME',
        cnpj: '11222333000181',
      } as any);
    });
    expect(ok).toBe(false);
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useFornecedores delete', () => {
  it('rejeita id vazio', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteFornecedor('');
    });
    expect(ok).toBe(false);
    expect(svc.deleteFornecedor).not.toHaveBeenCalled();
  });

  it('exclui com sucesso', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    svc.deleteFornecedor.mockResolvedValue(undefined);
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteFornecedor('f1');
    });
    expect(ok).toBe(true);
    expect(svc.deleteFornecedor).toHaveBeenCalledWith('f1');
  });

  it('propaga erro', async () => {
    svc.fetchFornecedores.mockResolvedValue([]);
    svc.deleteFornecedor.mockRejectedValue(new Error('FK'));
    const { result } = renderHook(() => useFornecedores());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.deleteFornecedor('f1');
    });
    expect(ok).toBe(false);
  });
});
