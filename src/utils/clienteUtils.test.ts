import { describe, it, expect } from 'vitest';
import { clienteUtils } from './clienteUtils';
import type { Cliente } from '@/types/cliente';
import type { SupabaseCliente } from '@/services/clienteService';

const baseCliente = (over: Partial<Cliente> = {}): Cliente =>
  ({
    nome: 'João',
    tipo: 'F',
    cpfCnpj: '',
    emails: [],
    telefones: [],
    ativo: true,
    endereco: { pais: 'Brasil' },
    qualificacaoFiscal: {},
    dadosPessoais: {
      estadoCivil: '',
      profissao: '',
      escolaridade: '',
      meiosComunicacaoPreferenciais: [],
    },
    contatos: [],
    documentos: [],
    ...over,
  }) as unknown as Cliente;

describe('clienteUtils.validateCliente', () => {
  it('rejeita quando nome vazio', () => {
    const r = clienteUtils.validateCliente(baseCliente({ nome: '   ' }));
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/Nome/);
  });

  it('rejeita quando tipo ausente', () => {
    const r = clienteUtils.validateCliente(baseCliente({ tipo: '' as Cliente['tipo'] }));
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/Tipo/);
  });

  it('rejeita PF com CPF inválido', () => {
    const r = clienteUtils.validateCliente(baseCliente({ tipo: 'F', cpfCnpj: '12345678900' }));
    expect(r.isValid).toBe(false);
    expect(r.error).toBe('CPF inválido.');
  });

  it('aceita PF com CPF válido', () => {
    const r = clienteUtils.validateCliente(baseCliente({ tipo: 'F', cpfCnpj: '52998224725' }));
    expect(r.isValid).toBe(true);
  });

  it('rejeita PJ com CNPJ inválido', () => {
    const r = clienteUtils.validateCliente(baseCliente({ tipo: 'J', cpfCnpj: '12345678000100' }));
    expect(r.isValid).toBe(false);
    expect(r.error).toBe('CNPJ inválido.');
  });

  it('aceita PJ com CNPJ válido', () => {
    const r = clienteUtils.validateCliente(
      baseCliente({ tipo: 'J', nome: 'ACME', cpfCnpj: '11222333000181' })
    );
    expect(r.isValid).toBe(true);
  });

  it('rejeita site PJ sem http/https', () => {
    const r = clienteUtils.validateCliente(
      baseCliente({
        tipo: 'J',
        nome: 'ACME',
        dadosEmpresa: {
          nomeFantasia: '',
          cnae: '',
          site: 'acme.com',
          formaAtuacao: '',
          dataFundacao: '',
          atividadePrincipal: '',
          contatoEmpresa: { nomeCompleto: '', departamento: '', cargo: '' },
        },
      })
    );
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/http/);
  });

  it('rejeita email inválido', () => {
    const r = clienteUtils.validateCliente(
      baseCliente({ emails: ['nao-email'] })
    );
    expect(r.isValid).toBe(false);
    expect(r.error).toMatch(/Email inválido/);
  });

  it('aceita quando CPF/CNPJ omitido (opcional)', () => {
    const r = clienteUtils.validateCliente(baseCliente({ cpfCnpj: '' }));
    expect(r.isValid).toBe(true);
  });
});

describe('clienteUtils.transformSupabaseToCliente', () => {
  it('faz round-trip com colunas JSON populadas', () => {
    const item: SupabaseCliente = {
      id: 'c1',
      empresa_representada_id: 'empresa-1',
      nome: 'ACME',
      apelido: 'AC',
      email: 'a@a.com',
      telefone: '11999',
      cpf_cnpj: '11222333000181',
      tipo: 'J',
      rg: null,
      data_nascimento: null,
      endereco: { pais: 'Brasil', uf: 'SP' },
      qualificacao_fiscal: { regime: 'simples' },
      nome_fantasia: 'ACME F',
      cnae: '1234',
      site: 'https://acme.com',
      forma_atuacao: 'servico',
      data_fundacao: '2020-01-01',
      atividade_principal: 'consultoria',
      contato_empresa: { nomeCompleto: 'X', departamento: 'Y', cargo: 'Z' },
      contatos: [{ nome: 'C1' }],
      documentos: [{ tipo: 'RG' }],
      emails: ['a@a.com', 'b@b.com'],
      telefones: ['11999', '11888'],
      dados_pessoais: { estadoCivil: 'solteiro' },
      setor_id: 'setor-1',
      ativo: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-06-01T00:00:00Z',
    };
    const c = clienteUtils.transformSupabaseToCliente(item);
    expect(c.id).toBe('c1');
    expect(c.tipo).toBe('J');
    expect(c.emails).toEqual(['a@a.com', 'b@b.com']);
    expect(c.telefones).toEqual(['11999', '11888']);
    expect(c.dadosEmpresa?.site).toBe('https://acme.com');
    expect(c.dadosEmpresa?.contatoEmpresa?.nomeCompleto).toBe('X');
    expect(c.contatos).toHaveLength(1);
    expect(c.documentos).toHaveLength(1);
    expect(c.setorId).toBe('setor-1');
    expect(c.ativo).toBe(true);
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
  });

  it('aplica defaults quando campos JSON ausentes', () => {
    const item = {
      id: 'c2',
      nome: 'PF',
      tipo: 'F',
      ativo: false,
      created_at: '2024-01-01T00:00:00Z',
    } as SupabaseCliente;
    const c = clienteUtils.transformSupabaseToCliente(item);
    expect(c.emails).toEqual(['']);
    expect(c.telefones).toEqual(['']);
    expect(c.endereco).toEqual({ pais: 'Brasil' });
    expect(c.contatos).toEqual([]);
    expect(c.documentos).toEqual([]);
    expect(c.ativo).toBe(false);
    expect(c.updatedAt).toBeUndefined();
  });
});

describe('clienteUtils.getErrorMessage', () => {
  it('mapeia 23505 (duplicado)', () => {
    expect(clienteUtils.getErrorMessage({ code: '23505' })).toMatch(/Já existe/);
  });
  it('mapeia 23503 (FK)', () => {
    expect(clienteUtils.getErrorMessage({ code: '23503' })).toMatch(/referência/);
  });
  it('fallback genérico', () => {
    expect(clienteUtils.getErrorMessage({ code: 'X' })).toMatch(/Não foi possível/);
  });
});
