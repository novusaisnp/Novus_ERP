import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { fornecedorService } from './fornecedorService';
import { supabase } from '@/integrations/supabase/client';
import type { Fornecedor } from '@/types/fornecedor';

const mock = supabase as unknown as { from: ReturnType<typeof vi.fn>; rpc: ReturnType<typeof vi.fn> };

const pj: Fornecedor = {
  tipo_pessoa: 'PJ',
  razaoSocial: 'ACME',
  nomeFantasia: 'AC',
  cnpj: '11222333000181',
  data_fundacao: new Date('2020-01-15T00:00:00Z'),
  cnae: '1234',
  capital_social: 1000,
  contato_principal: { nome: 'X', cargo: 'Y' },
  email: 'a@a.com',
  telefone: '11999',
  telefones: [{ numero: '11999', tipo: 'celular' }],
  endereco: { uf: 'SP' },
  dados_bancarios: { banco: 'BB', agencia: '0001', conta: '12345-6', tipo_conta: 'corrente' },
  ativo: true,
};

const pf: Fornecedor = {
  tipo_pessoa: 'PF',
  nome_completo: 'João',
  cpf: '52998224725',
  data_nascimento: new Date('1990-06-10T00:00:00Z'),
  rg: '123',
  email: '',
  ativo: true,
};

beforeEach(() => {
  mock.from.mockReset();
  mock.rpc.mockReset();
  mock.rpc.mockResolvedValue({ data: 'empresa-1', error: null });
});

describe('fornecedorService.transformToSupabaseFormat (PJ)', () => {
  it('serializa campos PJ e zera PF', () => {
    const p = fornecedorService.transformToSupabaseFormat(pj);
    expect(p).toMatchObject({
      tipo_pessoa: 'PJ',
      razao_social: 'ACME',
      nome_fantasia: 'AC',
      cnpj: '11222333000181',
      cnae: '1234',
      capital_social: 1000,
      nome_completo: null,
      cpf: null,
      email: 'a@a.com',
      telefone: '11999',
      telefones: [{ numero: '11999', tipo: 'celular' }],
      ativo: true,
    });
    expect(p.data_fundacao).toBe('2020-01-15');
    expect(typeof p.updated_at).toBe('string');
  });
});

describe('fornecedorService.transformToSupabaseFormat (PF)', () => {
  it('usa nome_completo como razao_social e zera PJ', () => {
    const p = fornecedorService.transformToSupabaseFormat(pf);
    expect(p).toMatchObject({
      tipo_pessoa: 'PF',
      razao_social: 'João',
      nome_completo: 'João',
      cpf: '52998224725',
      cnpj: null,
      cnae: null,
      capital_social: null,
    });
    expect(p.data_nascimento).toBe('1990-06-10');
  });
});

describe('fornecedorService CRUD', () => {
  it('fetchFornecedores retorna lista', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [{ id: 'f1' }], error: null }) }) }),
    }));
    expect(await fornecedorService.fetchFornecedores()).toEqual([{ id: 'f1' }]);
  });

  it('fetchFornecedores propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'x' } }) }) }),
    }));
    await expect(fornecedorService.fetchFornecedores()).rejects.toBeTruthy();
  });

  it('createFornecedor envia payload transformado', async () => {
    let captured: Record<string, unknown> = {};
    mock.from.mockImplementationOnce(() => ({
      insert: (p: Record<string, unknown>) => {
        captured = p;
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new' }, error: null }) }) };
      },
    }));
    const res = await fornecedorService.createFornecedor(pj);
    expect(captured.tipo_pessoa).toBe('PJ');
    expect(captured.razao_social).toBe('ACME');
    expect(captured.cnpj).toBe('11222333000181');
    expect(res).toEqual({ id: 'new' });
  });

  it('updateFornecedor usa eq(id) e retorna dado', async () => {
    let capturedId = '';
    mock.from.mockImplementationOnce(() => ({
      update: () => ({
        eq: (_c: string, v: string) => {
          capturedId = v;
          return { select: () => ({ single: () => Promise.resolve({ data: { id: v }, error: null }) }) };
        },
      }),
    }));
    const res = await fornecedorService.updateFornecedor('f-1', pj);
    expect(capturedId).toBe('f-1');
    expect(res).toEqual({ id: 'f-1' });
  });

  it('deleteFornecedor resolve e propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
    await expect(fornecedorService.deleteFornecedor('f-1')).resolves.toBeUndefined();

    mock.from.mockImplementationOnce(() => ({
      delete: () => ({ eq: () => Promise.resolve({ error: { message: 'FK' } }) }),
    }));
    await expect(fornecedorService.deleteFornecedor('f-2')).rejects.toBeTruthy();
  });
});
