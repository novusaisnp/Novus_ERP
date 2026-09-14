import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('@/lib/empresaAtiva', () => ({ getEmpresaAtivaIdOuFalha: async () => 'empresa-1' }));

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
});

// A `entidades` real (ao contrário da antiga `fornecedores`) não tem
// endereco/dados_bancarios jsonb nem os campos ricos de PJ/PF (cnae,
// capital_social, anexos, etc.) — só os campos flat que existem de verdade
// no banco. O mapeamento silenciosamente descarta o resto, o que é uma
// melhoria: antes esses campos extras faziam o INSERT falhar por completo
// (coluna inexistente), então o cadastro de fornecedor nunca funcionava.
describe('fornecedorService.transformToSupabaseFormat (PJ)', () => {
  it('serializa campos PJ reais e zera PF', () => {
    const p = fornecedorService.transformToSupabaseFormat(pj, 'empresa-1');
    expect(p).toMatchObject({
      empresa_representada_id: 'empresa-1',
      tipo_pessoa: 'PJ',
      nome: 'ACME',
      razao_social: 'ACME',
      nome_fantasia: 'AC',
      cnpj: '11222333000181',
      cpf: null,
      email: 'a@a.com',
      telefone: '11999',
      estado: 'SP',
      banco: 'BB',
      agencia: '0001',
      conta: '12345-6',
      tipo_conta: 'corrente',
      ativo: true,
    });
    expect(p.data_fundacao).toBe('2020-01-15');
    expect(typeof p.updated_at).toBe('string');
  });
});

describe('fornecedorService.transformToSupabaseFormat (PF)', () => {
  it('usa nome_completo como nome e zera PJ', () => {
    const p = fornecedorService.transformToSupabaseFormat(pf, 'empresa-1');
    expect(p).toMatchObject({
      tipo_pessoa: 'PF',
      nome: 'João',
      razao_social: null,
      cpf: '52998224725',
      rg: '123',
      cnpj: null,
      nome_fantasia: null,
    });
    expect(p.data_nascimento).toBe('1990-06-10');
  });
});

describe('fornecedorService CRUD', () => {
  it('fetchFornecedores retorna lista', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: [{ id: 'f1' }], error: null }) }) }),
        }),
      }),
    }));
    expect(await fornecedorService.fetchFornecedores()).toEqual([{ id: 'f1' }]);
  });

  it('fetchFornecedores propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ is: () => ({ order: () => Promise.resolve({ data: null, error: { message: 'x' } }) }) }),
        }),
      }),
    }));
    await expect(fornecedorService.fetchFornecedores()).rejects.toBeTruthy();
  });

  it('createFornecedor envia payload transformado e vincula papel Fornecedor', async () => {
    let capturedEntidade: Record<string, unknown> = {};
    let capturedPapel: Record<string, unknown> = {};
    mock.from
      .mockImplementationOnce(() => ({
        insert: (p: Record<string, unknown>) => {
          capturedEntidade = p;
          return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new' }, error: null }) }) };
        },
      }))
      .mockImplementationOnce(() => ({
        insert: (p: Record<string, unknown>) => {
          capturedPapel = p;
          return Promise.resolve({ error: null });
        },
      }));
    const res = await fornecedorService.createFornecedor(pj);
    expect(capturedEntidade.tipo_pessoa).toBe('PJ');
    expect(capturedEntidade.razao_social).toBe('ACME');
    expect(capturedEntidade.cnpj).toBe('11222333000181');
    expect(capturedPapel).toMatchObject({ entidade_id: 'new', papel: 'FORNECEDOR' });
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

  it('deleteFornecedor faz soft delete e propaga erro', async () => {
    mock.from.mockImplementationOnce(() => ({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }));
    await expect(fornecedorService.deleteFornecedor('f-1')).resolves.toBeUndefined();

    mock.from.mockImplementationOnce(() => ({
      update: () => ({ eq: () => Promise.resolve({ error: { message: 'FK' } }) }),
    }));
    await expect(fornecedorService.deleteFornecedor('f-2')).rejects.toBeTruthy();
  });
});
