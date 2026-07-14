import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { toastFn } = vi.hoisted(() => ({ toastFn: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
  toast: toastFn,
}));

vi.mock('@/services/produtoService', () => ({
  produtoService: {
    listar: vi.fn(),
    criar: vi.fn(),
    atualizar: vi.fn(),
    excluir: vi.fn(),
    buscarPorCodigoBarras: vi.fn(),
  },
}));

import { useProdutos } from './useProdutos';
import { produtoService } from '@/services/produtoService';

const svc = produtoService as any;

const row = {
  id: 'p1',
  nome: 'Item',
  preco_venda: 10,
  ativo: true,
  created_at: '2024-01-01',
};

beforeEach(() => {
  toastFn.mockReset();
  Object.values(svc).forEach((f: any) => f.mockReset());
});

describe('useProdutos load', () => {
  it('carrega e transforma', async () => {
    svc.listar.mockResolvedValue([row]);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.produtos).toHaveLength(1);
    expect(result.current.produtos[0].nome).toBe('Item');
  });

  it('toast em erro e seta error state', async () => {
    svc.listar.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });
});

describe('useProdutos criar/atualizar', () => {
  it('bloqueia quando validação falha', async () => {
    svc.listar.mockResolvedValue([]);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.criarProduto({ nome: '', preco_venda: 0 } as any);
    });
    expect(ok).toBe(false);
    expect(svc.criar).not.toHaveBeenCalled();
    expect(toastFn).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dados inválidos' }));
  });

  it('cria produto válido', async () => {
    svc.listar.mockResolvedValue([]);
    svc.criar.mockResolvedValue({ id: 'new' });
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.criarProduto({ nome: 'Novo', preco_venda: 10 } as any);
    });
    expect(ok).toBe(true);
    expect(svc.criar).toHaveBeenCalled();
    expect(svc.listar).toHaveBeenCalledTimes(2);
  });

  it('atualiza existente', async () => {
    svc.listar.mockResolvedValue([]);
    svc.atualizar.mockResolvedValue({ id: 'p1' });
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.atualizarProduto('p1', { nome: 'X', preco_venda: 10 } as any);
    });
    expect(ok).toBe(true);
    expect(svc.atualizar).toHaveBeenCalledWith('p1', expect.any(Object));
  });

  it('propaga erro do service', async () => {
    svc.listar.mockResolvedValue([]);
    svc.criar.mockRejectedValue({ code: '23505' });
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.criarProduto({ nome: 'X', preco_venda: 10 } as any);
    });
    expect(ok).toBe(false);
  });

  it('atualizar bloqueia com validação inválida', async () => {
    svc.listar.mockResolvedValue([]);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let ok: any;
    await act(async () => {
      ok = await result.current.atualizarProduto('p1', { nome: '', preco_venda: 0 } as any);
    });
    expect(ok).toBe(false);
    expect(svc.atualizar).not.toHaveBeenCalled();
  });
});

describe('useProdutos excluir', () => {
  it('exclui com sucesso', async () => {
    svc.listar.mockResolvedValue([]);
    svc.excluir.mockResolvedValue(undefined);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.excluirProduto('p1');
    });
    expect(ok).toBe(true);
    expect(svc.excluir).toHaveBeenCalledWith('p1');
  });

  it('propaga erro', async () => {
    svc.listar.mockResolvedValue([]);
    svc.excluir.mockRejectedValue(new Error('FK'));
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let ok: any;
    await act(async () => {
      ok = await result.current.excluirProduto('p1');
    });
    expect(ok).toBe(false);
  });
});

describe('useProdutos buscarPorCodigoBarras', () => {
  it('retorna produto encontrado', async () => {
    svc.listar.mockResolvedValue([]);
    svc.buscarPorCodigoBarras.mockResolvedValue(row);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let p: any;
    await act(async () => {
      p = await result.current.buscarPorCodigoBarras('789');
    });
    expect(p?.nome).toBe('Item');
  });

  it('retorna null quando não encontra', async () => {
    svc.listar.mockResolvedValue([]);
    svc.buscarPorCodigoBarras.mockResolvedValue(null);
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let p: any;
    await act(async () => {
      p = await result.current.buscarPorCodigoBarras('000');
    });
    expect(p).toBeNull();
  });

  it('retorna null em erro (não lança)', async () => {
    svc.listar.mockResolvedValue([]);
    svc.buscarPorCodigoBarras.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useProdutos());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let p: any;
    await act(async () => {
      p = await result.current.buscarPorCodigoBarras('000');
    });
    expect(p).toBeNull();
  });
});
