/**
 * Factories dinâmicas para dados de teste E2E.
 * Timestamps garantem unicidade entre execuções paralelas.
 */

const stamp = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export interface ClienteFactory {
  nome: string;
  cnpj_cpf: string;
}

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
  cnpj_cpf: '00000000000',
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
