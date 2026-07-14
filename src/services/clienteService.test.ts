import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock } from '@/test/supabaseMock';

vi.mock('@/integrations/supabase/client', () => {
  const mock = createSupabaseMock();
  return { supabase: mock, __mock: mock };
});

import { clienteService } from './clienteService';
import { supabase } from '@/integrations/supabase/client';
import type { Cliente } from '@/types/cliente';

const mock = supabase as any;

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
  qualificacaoFiscal: { regime: 'simples' } as any,
  dadosPessoais: {} as any,
  dadosEmpresa: {
    nomeFantasia: 'AC Fantasia',
    cnae: '1234',
    site: 'https://acme.com',
    formaAtuacao: 's',
    dataFundacao: '2020-01-01',
    atividadePrincipal: 'consultoria',
    contatoEmpresa: { nomeCompleto: 'X', departamento: 'Y', cargo: 'Z' },
  } as any,
  contatos: [{ nome: 'C1' } as any],
  documentos: [{ tipo: 'RG' } as any],
  setorId: 'setor-1',
  ativo: true,
} as unknown as Cliente;

beforeEach(() => {
  mock._calls.length = 0;
  mock._perOp = undefined;
});

describe('clienteService.fetchClientes', () => {
  it('retorna lista ordenada por nome', async () => {
    mock._perOp = undefined;
    // configure default from() result
    (mock as any).__setResult = null;
    // seed data via mock chain final
    const list = [{ id: '1', nome: 'A', tipo: 'F', ativo: true, created_at: '2024-01-01' }];
    vi.spyOn(mock, 'from').mockImplementationOnce((t: string) => {
      mock._calls.push({ table: t, op: 'from' });
      const chain: any = {
        select: () => chain,
        order: () => Promise.resolve({ data: list, error: null }),
      };
      return chain;
    });

    const res = await clienteService.fetchClientes();
    expect(res).toEqual(list);
  });

  it('lança erro em falha', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => {
      const chain: any = {
        select: () => chain,
        order: () => Promise.resolve({ data: null, error: { message: 'x' } }),
      };
      return chain;
    });
    await expect(clienteService.fetchClientes()).rejects.toThrow(/Não foi possível/);
  });
});

describe('clienteService.createCliente payload shape', () => {
  it('serializa em snake_case com JSON columns', async () => {
    let capturedPayload: any = null;
    vi.spyOn(mock, 'from').mockImplementationOnce(() => {
      const chain: any = {
        insert: (p: any) => {
          capturedPayload = p;
          return {
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'new-id' }, error: null }),
            }),
          };
        },
      };
      return chain;
    });

    const res = await clienteService.createCliente(cliente);
    expect(res).toEqual({ id: 'new-id' });
    expect(capturedPayload).toMatchObject({
      nome: 'ACME',
      apelido: 'AC',
      tipo: 'J',
      cpf_cnpj: '11222333000181',
      email: 'a@a.com',            // primeiro do array
      telefone: '11999',
      emails: ['a@a.com', 'b@b.com'],
      telefones: ['11999'],
      nome_fantasia: 'AC Fantasia',
      cnae: '1234',
      site: 'https://acme.com',
      forma_atuacao: 's',
      data_fundacao: '2020-01-01',
      atividade_principal: 'consultoria',
      setor_id: 'setor-1',
      ativo: true,
    });
    expect(capturedPayload.contatos).toEqual([{ nome: 'C1' }]);
    expect(capturedPayload.documentos).toEqual([{ tipo: 'RG' }]);
    expect(capturedPayload.qualificacao_fiscal).toEqual({ regime: 'simples' });
    expect(typeof capturedPayload.updated_at).toBe('string');
  });

  it('propaga erro do Supabase', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: { code: '23505', message: 'dup' } }),
        }),
      }),
    }));
    await expect(clienteService.createCliente(cliente)).rejects.toMatchObject({ code: '23505' });
  });
});

describe('clienteService.updateCliente', () => {
  it('chama update().eq(id) com payload correto', async () => {
    let capturedPayload: any = null;
    let capturedId: any = null;
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      update: (p: any) => {
        capturedPayload = p;
        return {
          eq: (_c: string, v: string) => {
            capturedId = v;
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: v }, error: null }),
              }),
            };
          },
        };
      },
    }));

    const res = await clienteService.updateCliente('c-1', cliente);
    expect(capturedId).toBe('c-1');
    expect(capturedPayload.nome).toBe('ACME');
    expect(capturedPayload.cpf_cnpj).toBe('11222333000181');
    expect(res).toEqual({ id: 'c-1' });
  });
});

describe('clienteService.deleteCliente', () => {
  it('chama delete().eq(id) e resolve', async () => {
    let capturedId: any = null;
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      delete: () => ({
        eq: (_c: string, v: string) => {
          capturedId = v;
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }));
    await expect(clienteService.deleteCliente('c-2')).resolves.toBeUndefined();
    expect(capturedId).toBe('c-2');
  });

  it('lança erro quando Supabase falha', async () => {
    vi.spyOn(mock, 'from').mockImplementationOnce(() => ({
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'FK' } }),
      }),
    }));
    await expect(clienteService.deleteCliente('c-3')).rejects.toThrow(/Não foi possível/);
  });
});
