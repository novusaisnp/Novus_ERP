import { describe, it, expect } from 'vitest';
import { fornecedorUtils } from './fornecedorUtils';
import { validarCPF as validarCPFCanonico } from '@/services/cnpjApi';
import type { Fornecedor } from '@/types/fornecedor';
import type { SupabaseFornecedor } from '@/services/fornecedorService';

const basePJ = (over: Partial<Fornecedor> = {}): Fornecedor =>
  ({
    tipo_pessoa: 'PJ',
    razaoSocial: 'ACME LTDA',
    cnpj: '11222333000181',
    email: '',
    ...over,
  }) as unknown as Fornecedor;

const basePF = (over: Partial<Fornecedor> = {}): Fornecedor =>
  ({
    tipo_pessoa: 'PF',
    nome_completo: 'João',
    cpf: '52998224725',
    email: '',
    ...over,
  }) as unknown as Fornecedor;

describe('fornecedorUtils.validateFornecedor (PJ)', () => {
  it('aceita PJ válido', () => {
    expect(fornecedorUtils.validateFornecedor(basePJ()).isValid).toBe(true);
  });
  it('rejeita PJ sem razão social', () => {
    const r = fornecedorUtils.validateFornecedor(basePJ({ razaoSocial: '' }));
    expect(r.error).toMatch(/Razão Social/);
  });
  it('rejeita PJ sem CNPJ', () => {
    const r = fornecedorUtils.validateFornecedor(basePJ({ cnpj: '' }));
    expect(r.error).toMatch(/CNPJ é obrigatório/);
  });
  it('rejeita CNPJ com tamanho errado', () => {
    const r = fornecedorUtils.validateFornecedor(basePJ({ cnpj: '123' }));
    expect(r.error).toMatch(/14 dígitos/);
  });
  it('rejeita CNPJ com DV inválido', () => {
    const r = fornecedorUtils.validateFornecedor(basePJ({ cnpj: '11222333000199' }));
    expect(r.error).toBe('CNPJ inválido.');
  });
});

describe('fornecedorUtils.validateFornecedor (PF)', () => {
  it('aceita PF válido', () => {
    expect(fornecedorUtils.validateFornecedor(basePF()).isValid).toBe(true);
  });
  it('rejeita PF sem nome', () => {
    const r = fornecedorUtils.validateFornecedor(basePF({ nome_completo: '' }));
    expect(r.error).toMatch(/Nome completo/);
  });
  it('rejeita PF sem CPF', () => {
    const r = fornecedorUtils.validateFornecedor(basePF({ cpf: '' }));
    expect(r.error).toMatch(/CPF é obrigatório/);
  });
  it('rejeita CPF com tamanho errado', () => {
    const r = fornecedorUtils.validateFornecedor(basePF({ cpf: '123' }));
    expect(r.error).toMatch(/11 dígitos/);
  });
  it('rejeita CPF com DV inválido', () => {
    const r = fornecedorUtils.validateFornecedor(basePF({ cpf: '52998224799' }));
    expect(r.error).toBe('CPF inválido.');
  });
});

describe('fornecedorUtils.validateFornecedor (email)', () => {
  it('rejeita email inválido', () => {
    const r = fornecedorUtils.validateFornecedor(basePJ({ email: 'x@' }));
    expect(r.error).toBe('Email inválido.');
  });
});

describe('paridade fornecedorUtils.validarCPF ↔ cnpjApi.validarCPF', () => {
  const casos: string[] = [
    '52998224725', // válido
    '529.982.247-25', // válido formatado
    '12345678900', // inválido
    '11111111111', // repetido
    '00000000000',
    '',
    '123',
    '52998224726', // DV2 errado
    '52998224735', // DV1 errado
  ];
  it.each(casos)('resultado igual para "%s"', (cpf) => {
    expect(fornecedorUtils.validarCPF(cpf)).toBe(validarCPFCanonico(cpf));
  });
});

describe('fornecedorUtils.validarEmail / formatarCNPJ / formatarCPF', () => {
  it('email válido', () => {
    expect(fornecedorUtils.validarEmail('a@b.co')).toBe(true);
    expect(fornecedorUtils.validarEmail('nao-email')).toBe(false);
  });
  it('formatarCNPJ', () => {
    expect(fornecedorUtils.formatarCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('formatarCPF', () => {
    expect(fornecedorUtils.formatarCPF('52998224725')).toBe('529.982.247-25');
  });
});

describe('fornecedorUtils.transformSupabaseToFornecedor', () => {
  it('round-trip PJ com colunas reais de entidades', () => {
    const item: SupabaseFornecedor = {
      id: 'f1',
      tipo_pessoa: 'PJ',
      razao_social: 'ACME',
      nome_fantasia: 'AC',
      cnpj: '11222333000181',
      data_fundacao: '2020-01-01',
      email: 'a@a.com',
      telefone: '11999',
      estado: 'SP',
      banco: 'BB',
      agencia: '1',
      conta: '2',
      tipo_conta: 'corrente',
      ativo: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    };
    const f = fornecedorUtils.transformSupabaseToFornecedor(item);
    expect(f.id).toBe('f1');
    expect(f.tipo_pessoa).toBe('PJ');
    expect(f.razaoSocial).toBe('ACME');
    expect(f.cnpj).toBe('11222333000181');
    expect(f.data_fundacao).toBeInstanceOf(Date);
    expect(f.telefones).toEqual([{ numero: '11999', tipo: 'celular' }]);
    expect(f.endereco?.uf).toBe('SP');
    expect(f.dados_bancarios?.banco).toBe('BB');
    expect(f.ativo).toBe(true);
    expect(f.createdAt).toBeInstanceOf(Date);
    expect(f.updatedAt).toBeInstanceOf(Date);
  });

  it('aplica defaults quando campos ausentes', () => {
    const f = fornecedorUtils.transformSupabaseToFornecedor({
      id: 'f2',
      tipo_pessoa: 'PJ',
      ativo: true,
      created_at: '2024-01-01T00:00:00Z',
    });
    expect(f.tipo_pessoa).toBe('PJ');
    expect(f.razaoSocial).toBe('');
    expect(f.telefones).toEqual([]);
    expect(f.dados_bancarios?.tipo_conta).toBe('corrente');
    expect(f.usar_endereco_principal_correspondencia).toBe(true);
    expect(f.ativo).toBe(true);
  });
});

describe('fornecedorUtils.getErrorMessage', () => {
  it('23505 com cnpj', () => {
    expect(fornecedorUtils.getErrorMessage({ code: '23505', message: 'dup cnpj' })).toMatch(/CNPJ/);
  });
  it('23505 com cpf', () => {
    expect(fornecedorUtils.getErrorMessage({ code: '23505', message: 'dup cpf' })).toMatch(/CPF/);
  });
  it('23503 FK', () => {
    expect(fornecedorUtils.getErrorMessage({ code: '23503' })).toMatch(/referência/);
  });
  it('fallback', () => {
    expect(fornecedorUtils.getErrorMessage({})).toMatch(/Não foi possível/);
  });
});
