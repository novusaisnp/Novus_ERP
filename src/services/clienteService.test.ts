import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock, type SupabaseMockChain } from '@/test/supabaseMock';

vi.mock('@/integrations/supabase/client', () => {
  const mock = createSupabaseMock();
  return { supabase: mock, __mock: mock };
});

import { clienteService } from './clienteService';
import { supabase } from '@/integrations/supabase/client';
import type { Cliente } from '@/types/cliente';

const mock = supabase as unknown as SupabaseMockChain;

const cliente: Cliente = {
  nome: 'ACME',
  apelido: 'AC',
  tipo: 'J',
  cpfCnpj: '11222333000181',
  emails: ['a@a.com', 'b@b.com'],
  telefones: ['11999'],
  rg: '',
  dataNascimento: '',
  endereco: { pais: 'Brasil' },
  qualificacaoFiscal: { regime: 'simples' },
  dadosPessoais: {},
  dadosEmpresa: {
    nomeFantasia: 'AC Fantasia',
    cnae: '1234',
    site: 'https://acme.com',
    formaAtuacao: 's',
    dataFundacao: '2020-01-01',
    atividadePrincipal: 'consultoria',
    contatoEmpresa: { nomeCompleto: 'X', departamento: 'Y', cargo: 'Z' },
  },
  contatos: [{ nome: 'C1' }],
  documentos: [{ tipo: 'RG' }],
  setorId: 'setor-1',
  ativo: true,
} as unknown as Cliente;

beforeEach(() => {
  mock._calls.length = 0;
  mock._perOp = undefined;
});

interface SelectChain {
  select: () => SelectChain;
  eq: () => SelectChain;
  is: () => SelectChain;
  order: () => Promise<{ data: unknown; error: unknown }>;
}

describe('clienteService.fetchClientes', () => {
  it('retorna lista ordenada por nome (só entidades com papel CLIENTE)', async () => {
    mock._perOp = undefined;
    const list = [{ id: '1', nome: 'A', tipo_pessoa: 'PF', ativo: true, created_at: '2024-01-01' }];
    vi.spyOn(mock, 'from').mockImplementationOnce((t: string) => {
      mock._calls.push({ table: t, op: 'from' });
      const chain: SelectChain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => Promise.resolve({ data: list, error: null }),
      };
      return chain as unknown as SupabaseMockChain;
    });

    const res = await clienteService.fetchClientes('empresa-1');
    expect(res).toEqual([{
      id: '1', nome: 'A', tipo: 'F', ativo: true, created_at: '2024-01-01',
      cpf_cnpj: null, contatos: [], documentos: [],
      endereco: { cep: undefined, logradouro: undefined, numero: undefined, complemento: undefined, bairro: undefined, cidade: undefined, uf: undefined },
    }]);
  });

  it('lança erro em falha', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => {
      const chain: SelectChain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        order: () => Promise.resolve({ data: null, error: { message: 'x' } }),
      };
      return chain as unknown as SupabaseMockChain;
    });
    await expect(clienteService.fetchClientes('empresa-1')).rejects.toThrow(/Não foi possível/);
  });

  it('lança erro quando empresaRepresentadaId não é fornecido', async () => {
    await expect(clienteService.fetchClientes('')).rejects.toThrow(/ID da empresa/);
  });
});

describe('clienteService.createCliente payload shape', () => {
  it('serializa em tipo_pessoa/cpf/cnpj + endereço flat e vincula papel Cliente', async () => {
    let capturedEntidade: Record<string, unknown> = {};
    let capturedPapel: Record<string, unknown> = {};
    vi.spyOn(mock, 'from').mockImplementation((table: string) => {
      if (table === 'entidades') {
        return {
          insert: (p: unknown) => {
            capturedEntidade = p as Record<string, unknown>;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'new-id' }, error: null }),
              }),
            };
          },
        } as unknown as SupabaseMockChain;
      }
      return {
        insert: (p: unknown) => {
          capturedPapel = p as Record<string, unknown>;
          return Promise.resolve({ data: null, error: null });
        },
      } as unknown as SupabaseMockChain;
    });

    const res = await clienteService.createCliente(cliente, 'empresa-1');
    expect(res).toMatchObject({ id: 'new-id', ativo: false });
    expect(capturedEntidade).toMatchObject({
      empresa_representada_id: 'empresa-1',
      tipo_pessoa: 'PJ',
      nome: 'ACME',
      apelido: 'AC',
      cnpj: '11222333000181',
      cpf: null,
      email: 'a@a.com', // primeiro do array
      telefone: '11999',
      nome_fantasia: 'AC Fantasia',
      cnae: '1234',
      site: 'https://acme.com',
      forma_atuacao: 's',
      data_fundacao: '2020-01-01',
      atividade_principal: 'consultoria',
      setor_id: 'setor-1',
      ativo: true,
    });
    expect(capturedEntidade.contatos).toEqual([{ nome: 'C1' }]);
    expect(capturedEntidade.documentos).toEqual([{ tipo: 'RG' }]);
    expect(capturedEntidade.qualificacao_fiscal).toEqual({ regime: 'simples' });
    expect(typeof capturedEntidade.updated_at).toBe('string');
    expect(capturedPapel).toMatchObject({ entidade_id: 'new-id', empresa_representada_id: 'empresa-1', papel: 'CLIENTE' });
  });

  it('propaga erro do Supabase', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }),
        }),
      }),
    }) as unknown as SupabaseMockChain);
    await expect(clienteService.createCliente(cliente, 'empresa-1')).rejects.toMatchObject({ code: '23505' });
  });
});

describe('clienteService.updateCliente', () => {
  it('chama update().eq(id).eq(empresa) com payload correto', async () => {
    let capturedPayload: Record<string, unknown> = {};
    let capturedId = '';
    let capturedEmpresaId = '';
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      update: (p: unknown) => {
        capturedPayload = p as Record<string, unknown>;
        return {
          eq: (_c1: string, v1: string) => {
            capturedId = v1;
            return {
              eq: (_c2: string, v2: string) => {
                capturedEmpresaId = v2;
                return {
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: v1 }, error: null }),
                  }),
                };
              },
            };
          },
        };
      },
    }) as unknown as SupabaseMockChain);

    const res = await clienteService.updateCliente('c-1', cliente, 'empresa-1');
    expect(capturedId).toBe('c-1');
    expect(capturedEmpresaId).toBe('empresa-1');
    expect(capturedPayload.nome).toBe('ACME');
    expect(capturedPayload.cnpj).toBe('11222333000181');
    expect(res).toMatchObject({ id: 'c-1', ativo: false });
  });
});

describe('clienteService.deleteCliente', () => {
  it('faz soft delete via update(deleted_at) e resolve', async () => {
    let capturedId = '';
    let capturedEmpresaId = '';
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      update: () => ({
        eq: (_c1: string, v1: string) => {
          capturedId = v1;
          return {
            eq: (_c2: string, v2: string) => {
              capturedEmpresaId = v2;
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      }),
    }) as unknown as SupabaseMockChain);
    await expect(clienteService.deleteCliente('c-2', 'empresa-1')).resolves.toBe(true);
    expect(capturedId).toBe('c-2');
    expect(capturedEmpresaId).toBe('empresa-1');
  });

  it('lança erro quando Supabase falha', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      update: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'FK' } }),
        }),
      }),
    }) as unknown as SupabaseMockChain);
    await expect(clienteService.deleteCliente('c-3', 'empresa-1')).rejects.toMatchObject({ message: 'FK' });
  });

  it('lança erro quando empresaRepresentadaId não é fornecido', async () => {
    await expect(clienteService.deleteCliente('c-4', '')).rejects.toThrow(/ID da empresa/);
  });
});
