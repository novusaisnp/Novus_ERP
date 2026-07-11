/**
 * [LOTE 3C] Mapeamento centralizado de erros do domínio bancário para
 * mensagens amigáveis em PT-BR. Aplicado nos hooks (onError) para evitar
 * duplicação em múltiplos componentes.
 */

export type BankingErrorCode =
  | 'SALDO_INSUFICIENTE'
  | 'ESTORNO_DUPLICADO'
  | 'TRANSFERENCIA_INVALIDA'
  | 'CONTA_INATIVA';

export interface BankingErrorToast {
  title: string;
  description: string;
}

const MAP: Record<BankingErrorCode, BankingErrorToast> = {
  SALDO_INSUFICIENTE: {
    title: 'Saldo insuficiente',
    description: 'A conta bancária não possui saldo suficiente para esta operação.',
  },
  ESTORNO_DUPLICADO: {
    title: 'Estorno já realizado',
    description: 'Esta movimentação já foi estornada anteriormente.',
  },
  TRANSFERENCIA_INVALIDA: {
    title: 'Transferência inválida',
    description: 'Verifique as contas de origem e destino — não podem ser iguais e devem estar ativas.',
  },
  CONTA_INATIVA: {
    title: 'Conta inativa',
    description: 'A conta bancária selecionada está inativa e não aceita movimentações.',
  },
};

const extractCode = (err: unknown): string | null => {
  if (!err || typeof err !== 'object') return null;
  const anyErr = err as Record<string, unknown>;
  const candidate =
    (typeof anyErr.code === 'string' && anyErr.code) ||
    (typeof anyErr.name === 'string' && anyErr.name) ||
    (typeof anyErr.message === 'string' && anyErr.message) ||
    null;
  if (!candidate) return null;
  const upper = candidate.toUpperCase();
  const found = (Object.keys(MAP) as BankingErrorCode[]).find((k) => upper.includes(k));
  return found ?? null;
};

export const mapBankingError = (err: unknown, fallbackTitle = 'Erro'): BankingErrorToast => {
  const code = extractCode(err) as BankingErrorCode | null;
  if (code && MAP[code]) return MAP[code];
  const message =
    (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
      ? (err as any).message
      : null) || 'Ocorreu um erro inesperado.';
  return { title: fallbackTitle, description: message };
};
