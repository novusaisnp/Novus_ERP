import { describe, it, expect } from 'vitest';
import { produtoUtils } from './produtoUtils';
import type { Produto, SupabaseProduto } from '@/types/produto';

const baseProduto = (over: Partial<Produto> = {}): Produto =>
  ({
    nome: 'Item X',
    preco_venda: 10,
    ativo: true,
    ...over,
  }) as unknown as Produto;

describe('produtoUtils.validarProduto', () => {
  it('aceita produto válido', () => {
    const r = produtoUtils.validarProduto(baseProduto());
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejeita nome vazio', () => {
    const r = produtoUtils.validarProduto(baseProduto({ nome: '   ' }));
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Nome do produto é obrigatório');
  });

  it('rejeita preço <= 0', () => {
    expect(produtoUtils.validarProduto(baseProduto({ preco_venda: 0 })).errors)
      .toContain('Preço de venda deve ser maior que zero');
    expect(produtoUtils.validarProduto(baseProduto({ preco_venda: -1 })).errors)
      .toContain('Preço de venda deve ser maior que zero');
  });

  it('rejeita dimensões/estoques negativos', () => {
    const r = produtoUtils.validarProduto(
      baseProduto({ peso: -1, altura: -1, largura: -1, comprimento: -1, estoque_minimo: -1, estoque_atual: -1 })
    );
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(6);
  });
});

describe('produtoUtils.calcularMargemLucro / calcularPrecoVenda', () => {
  it('margem = 0 quando preço compra <= 0', () => {
    expect(produtoUtils.calcularMargemLucro(0, 100)).toBe(0);
    expect(produtoUtils.calcularMargemLucro(-1, 100)).toBe(0);
  });
  it('margem correta', () => {
    expect(produtoUtils.calcularMargemLucro(100, 150)).toBe(50);
  });
  it('preço venda = 0 quando compra <= 0', () => {
    expect(produtoUtils.calcularPrecoVenda(0, 50)).toBe(0);
  });
  it('preço venda correto', () => {
    expect(produtoUtils.calcularPrecoVenda(100, 50)).toBe(150);
  });
});

describe('produtoUtils.formatar*', () => {
  it('formata preço em BRL', () => {
    const out = produtoUtils.formatarPreco(1234.5);
    expect(out).toMatch(/R\$/);
    expect(out).toMatch(/1\.234,50/);
  });
  it('formata peso', () => {
    expect(produtoUtils.formatarPeso(1.5)).toBe('1.50 kg');
  });
  it('formata dimensões filtrando zeros', () => {
    expect(produtoUtils.formatarDimensoes(10, 0, 5)).toBe('10 x 5 cm');
    expect(produtoUtils.formatarDimensoes()).toBe('');
  });
});

describe('produtoUtils.transformSupabaseToProduto', () => {
  it('round-trip completo', () => {
    const item = {
      id: 'p1',
      nome: 'X',
      descricao: 'desc',
      codigo: 'C1',
      categoria_id: 'cat',
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
      estoque_maximo: 100,
      controla_estoque: true,
      ativo: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    } as unknown as SupabaseProduto;
    const p = produtoUtils.transformSupabaseToProduto(item);
    expect(p.id).toBe('p1');
    expect(p.preco_venda).toBe(10);
    expect(p.controla_estoque).toBe(true);
    expect(p.ativo).toBe(true);
    expect(p.created_at).toBeInstanceOf(Date);
    expect(p.updated_at).toBeInstanceOf(Date);
  });

  it('aplica defaults quando campos ausentes', () => {
    const p = produtoUtils.transformSupabaseToProduto({ id: 'p2', nome: 'Y' } as any);
    expect(p.descricao).toBe('');
    expect(p.preco_venda).toBe(0);
    expect(p.estoque_atual).toBe(0);
    expect(p.controla_estoque).toBe(false);
    expect(p.ativo).toBe(true);
    expect(p.created_at).toBeUndefined();
  });

  it('mantém ativo=false explícito', () => {
    const p = produtoUtils.transformSupabaseToProduto({ id: 'p3', nome: 'Z', ativo: false } as any);
    expect(p.ativo).toBe(false);
  });
});

describe('produtoUtils.getErrorMessage', () => {
  it('23505', () => {
    expect(produtoUtils.getErrorMessage({ code: '23505' })).toMatch(/Já existe/);
  });
  it('23503', () => {
    expect(produtoUtils.getErrorMessage({ code: '23503' })).toMatch(/referência/);
  });
  it('fallback', () => {
    expect(produtoUtils.getErrorMessage({})).toMatch(/Não foi possível/);
  });
});
