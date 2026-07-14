import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { produtoService } from './produtoService';
import { supabase } from '@/integrations/supabase/client';
import type { Produto } from '@/types/produto';

const mock = supabase as any;

const produto: Produto = {
  nome: 'Item',
  descricao: 'desc',
  codigo: 'C1',
  categoria_id: 'cat-1',
  peso: 1,
  altura: 2,
  largura: 3,
  comprimento: 4,
  preco_custo: 5,
  preco_venda: 10,
  margem_lucro: 100,
  imagem_url: 'http://img',
  ncm: '1234',
  cest: '5678',
  estoque_atual: 5,
  estoque_minimo: 1,
  ativo: true,
} as any;

beforeEach(() => {
  mock.from.mockReset();
  mock.rpc.mockReset();
});

describe('produtoService.listar', () => {
  it('retorna lista ordenada por created_at desc', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({ order: () => Promise.resolve({ data: [{ id: 'p1' }], error: null }) }),
    }));
    expect(await produtoService.listar()).toEqual([{ id: 'p1' }]);
  });

  it('propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'x' } }) }),
    }));
    await expect(produtoService.listar()).rejects.toBeTruthy();
  });
});

describe('produtoService.buscarPorId', () => {
  it('retorna produto ou null', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'p1' }, error: null }) }) }),
    }));
    expect(await produtoService.buscarPorId('p1')).toEqual({ id: 'p1' });
  });
});

describe('produtoService.criar', () => {
  it('obtém empresa_id via RPC e envia payload snake_case', async () => {
    mock.rpc.mockResolvedValueOnce({ data: 'emp-1', error: null });
    let captured: any = null;
    mock.from.mockImplementationOnce(() => ({
      insert: (p: any) => {
        captured = p;
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new' }, error: null }) }) };
      },
    }));
    const res = await produtoService.criar(produto);
    expect(mock.rpc).toHaveBeenCalledWith('get_user_empresa_id');
    expect(captured).toMatchObject({
      empresa_representada_id: 'emp-1',
      nome: 'Item',
      descricao: 'desc',
      codigo: 'C1',
      categoria_id: 'cat-1',
      preco_venda: 10,
      estoque_atual: 5,
      estoque_minimo: 1,
      ativo: true,
    });
    expect(res).toEqual({ id: 'new' });
  });

  it('lança quando RPC falha', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(produtoService.criar(produto)).rejects.toThrow(/empresa/);
  });

  it('lança quando usuário sem empresa', async () => {
    mock.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(produtoService.criar(produto)).rejects.toThrow(/sem empresa/);
  });
});

describe('produtoService.atualizar', () => {
  it('envia payload com updated_at e usa eq(id)', async () => {
    let captured: any = null;
    let capturedId: any = null;
    mock.from.mockImplementationOnce(() => ({
      update: (p: any) => {
        captured = p;
        return {
          eq: (_c: string, v: string) => {
            capturedId = v;
            return { select: () => ({ single: () => Promise.resolve({ data: { id: v }, error: null }) }) };
          },
        };
      },
    }));
    const res = await produtoService.atualizar('p-1', produto);
    expect(capturedId).toBe('p-1');
    expect(captured.nome).toBe('Item');
    expect(typeof captured.updated_at).toBe('string');
    expect(res).toEqual({ id: 'p-1' });
  });
});

describe('produtoService.excluir', () => {
  it('resolve com sucesso', async () => {
    mock.from.mockImplementationOnce(() => ({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
    await expect(produtoService.excluir('p-1')).resolves.toBeUndefined();
  });
  it('propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      delete: () => ({ eq: () => Promise.resolve({ error: { message: 'FK' } }) }),
    }));
    await expect(produtoService.excluir('p-2')).rejects.toBeTruthy();
  });
});

describe('produtoService.buscarPorCodigoBarras', () => {
  it('retorna produto', async () => {
    let capturedCol: any = null;
    mock.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: (c: string) => {
          capturedCol = c;
          return { maybeSingle: () => Promise.resolve({ data: { id: 'p1' }, error: null }) };
        },
      }),
    }));
    expect(await produtoService.buscarPorCodigoBarras('789')).toEqual({ id: 'p1' });
    expect(capturedCol).toBe('codigo_barras');
  });
});
