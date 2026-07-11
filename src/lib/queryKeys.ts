/**
 * [LOTE 3B] Fábrica única de query keys.
 * - Chaves legadas (['contas-pagar'], ['contas-bancarias'], etc.) permanecem
 *   compatíveis: invalidateQueries com o prefixo raiz continua funcionando.
 * - Novas mutations devem invalidar chaves precisas via `qk.*`.
 */

export const qk = {
  contasPagar: {
    all: ['contas-pagar'] as const,
    list: (filtros?: unknown) => ['contas-pagar', 'list', filtros ?? null] as const,
    stats: () => ['contas-pagar-stats'] as const,
    detail: (id: string) => ['contas-pagar', 'detail', id] as const,
  },
  contasReceber: {
    all: ['contas-receber'] as const,
    list: (filtros?: unknown) => ['contas-receber', 'list', filtros ?? null] as const,
    stats: () => ['contas-receber-stats'] as const,
    detail: (id: string) => ['contas-receber', 'detail', id] as const,
  },
  contasBancarias: {
    all: ['contas-bancarias'] as const,
    list: () => ['contas-bancarias', 'list'] as const,
    detail: (id: string) => ['contas-bancarias', 'detail', id] as const,
    stats: () => ['contas-bancarias-estatisticas'] as const,
    ativas: () => ['contas-bancarias-ativas'] as const,
  },
  movimentacoesFinanceiras: {
    all: ['movimentacoes-financeiras'] as const,
    list: (filtros?: unknown) => ['movimentacoes-financeiras', filtros ?? null] as const,
  },
  movimentacoesBancarias: {
    all: ['movimentacoes-bancarias'] as const,
    list: (filtros?: unknown) => ['movimentacoes-bancarias', filtros ?? null] as const,
    stats: (filtros?: unknown) => ['movimentacoes-bancarias-estatisticas', filtros ?? null] as const,
    detail: (id: string) => ['movimentacao-bancaria', id] as const,
  },
} as const;

export type QueryKeys = typeof qk;
