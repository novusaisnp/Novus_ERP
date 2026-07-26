import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validarCNPJ,
  validarCPF,
  formatarCNPJ,
  formatarCPF,
  formatarCEP,
  consultarCNPJ,
  consultarCEP,
} from './cnpjApi';

// CNPJ válido conhecido: 11.222.333/0001-81
const CNPJ_VALIDO = '11222333000181';
// CPF válido conhecido: 529.982.247-25
const CPF_VALIDO = '52998224725';

describe('validarCNPJ', () => {
  it('aceita CNPJ válido (limpo e formatado)', () => {
    expect(validarCNPJ(CNPJ_VALIDO)).toBe(true);
    expect(validarCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com tamanho errado', () => {
    expect(validarCNPJ('')).toBe(false);
    expect(validarCNPJ('123')).toBe(false);
    expect(validarCNPJ('1122233300018')).toBe(false); // 13
    expect(validarCNPJ('112223330001811')).toBe(false); // 15
  });

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(validarCNPJ('11111111111111')).toBe(false);
    expect(validarCNPJ('00000000000000')).toBe(false);
  });

  it('rejeita CNPJ com DV errado', () => {
    expect(validarCNPJ('11222333000182')).toBe(false); // DV2 errado
    expect(validarCNPJ('11222333000191')).toBe(false); // DV1 errado
  });
});

describe('validarCPF', () => {
  it('aceita CPF válido (limpo e formatado)', () => {
    expect(validarCPF(CPF_VALIDO)).toBe(true);
    expect(validarCPF('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF com tamanho errado', () => {
    expect(validarCPF('')).toBe(false);
    expect(validarCPF('123')).toBe(false);
    expect(validarCPF('5299822472')).toBe(false); // 10
    expect(validarCPF('529982247255')).toBe(false); // 12
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(validarCPF('11111111111')).toBe(false);
    expect(validarCPF('00000000000')).toBe(false);
  });

  it('rejeita CPF com DV errado', () => {
    expect(validarCPF('52998224726')).toBe(false); // DV2 errado
    expect(validarCPF('52998224735')).toBe(false); // DV1 errado
  });
});

describe('formatarCNPJ', () => {
  it('formata CNPJ limpo', () => {
    expect(formatarCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });
  it('remove caracteres não numéricos antes de formatar', () => {
    expect(formatarCNPJ('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });
});

describe('formatarCPF', () => {
  it('formata CPF limpo', () => {
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
  });
  it('remove caracteres não numéricos antes de formatar', () => {
    expect(formatarCPF('529.982.247-25')).toBe('529.982.247-25');
  });
});

describe('formatarCEP', () => {
  it('formata CEP limpo', () => {
    expect(formatarCEP('01310100')).toBe('01310-100');
  });
});

describe('consultarCNPJ (fetch mockado)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retorna dados mapeados quando resposta OK', async () => {
    const cnpj = '22222222000191'; // único para evitar cache entre testes
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cnpj,
        razao_social: 'ACME LTDA',
        nome_fantasia: 'ACME',
        logradouro: 'Rua X',
        numero: '100',
        complemento: '',
        bairro: 'Centro',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '01000000',
        situacao_cadastral: 'ATIVA',
        porte: 'ME',
      }),
    });

    const data = await consultarCNPJ(cnpj);
    expect(data).not.toBeNull();
    expect(data?.nome).toBe('ACME LTDA');
    expect(data?.fantasia).toBe('ACME');
    expect(data?.uf).toBe('SP');
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it('retorna null com tamanho inválido', async () => {
    const data = await consultarCNPJ('123');
    expect(data).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('retorna null em 404', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const data = await consultarCNPJ('33333333000191');
    expect(data).toBeNull();
  });

  it('retorna null em erro de rede', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const data = await consultarCNPJ('44444444000191');
    expect(data).toBeNull();
  });

  it('usa cache na segunda chamada com mesmo CNPJ', async () => {
    const cnpj = '55555555000191';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ cnpj, razao_social: 'CACHED' }),
    });
    await consultarCNPJ(cnpj);
    await consultarCNPJ(cnpj);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});

describe('consultarCEP (fetch mockado)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('retorna dados mapeados quando resposta OK', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Av Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });
    const data = await consultarCEP('01310100');
    expect(data?.uf).toBe('SP');
    expect(data?.logradouro).toBe('Av Paulista');
  });

  it('retorna null com tamanho inválido', async () => {
    const data = await consultarCEP('123');
    expect(data).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('retorna null em 404', async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const data = await consultarCEP('99999998');
    expect(data).toBeNull();
  });

  it('retorna null quando ViaCEP responde { erro: true }', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ erro: true }),
    });
    const data = await consultarCEP('99999997');
    expect(data).toBeNull();
  });

  it('retorna null em erro de rede', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const data = await consultarCEP('99999996');
    expect(data).toBeNull();
  });
});
