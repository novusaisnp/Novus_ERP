/**
 * Factories dinâmicas para dados de teste E2E.
 * Timestamps garantem unicidade entre execuções paralelas.
 */

const stamp = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export interface ClienteFactory {
  nome: string;
  cnpj_cpf: string;
}

/** Gera um CNPJ com dígitos verificadores válidos (algoritmo em src/services/cnpjApi.ts). */
const gerarCnpjValido = (): string => {
  const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const digito = (nums: number[], pesoInicial: number): number => {
    let soma = 0;
    let peso = pesoInicial;
    for (const n of nums) {
      soma += n * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = digito(base, 5);
  const d2 = digito([...base, d1], 6);
  return [...base, d1, d2].join('');
};

export interface ProdutoFactory {
  codigo: string;
  descricao: string;
}

export interface VendaFactory {
  cliente_nome: string;
  itens: Array<{ produto_codigo: string; quantidade: number; valor_unitario: number }>;
}

export const makeCliente = (overrides: Partial<ClienteFactory> = {}): ClienteFactory => ({
  nome: `Cliente E2E ${stamp()}`,
  cnpj_cpf: gerarCnpjValido(),
  ...overrides,
});

export const makeProduto = (overrides: Partial<ProdutoFactory> = {}): ProdutoFactory => ({
  codigo: `PROD-E2E-${stamp()}`,
  descricao: `Produto E2E ${stamp()}`,
  ...overrides,
});

export const makeVenda = (overrides: Partial<VendaFactory> = {}): VendaFactory => ({
  cliente_nome: 'Cliente E2E',
  itens: [{ produto_codigo: 'PROD-E2E', quantidade: 1, valor_unitario: 100 }],
  ...overrides,
});

export interface RegraConciliacaoFactory {
  nome: string;
  tipo: 'PALAVRA_CHAVE' | 'VALOR_EXATO' | 'REGEX' | 'CONTRAPARTE';
  padrao: string;
}

export const makeRegraConciliacao = (
  overrides: Partial<RegraConciliacaoFactory> = {},
): RegraConciliacaoFactory => ({
  nome: `Regra E2E ${stamp()}`,
  tipo: 'PALAVRA_CHAVE',
  padrao: 'ALUGUEL',
  ...overrides,
});
