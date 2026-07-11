/**
 * [LOTE 3C/3D] Mapeamento centralizado de erros do domínio bancário para
 * mensagens amigáveis em PT-BR. Aplicado nos hooks (onError) para evitar
 * duplicação em múltiplos componentes.
 *
 * [LOTE 3D] `BankingError` é a forma estruturada preferida para lançar erros
 * do domínio bancário no service layer. `mapBankingError` prioriza `err.code`
 * quando `err instanceof BankingError`, mantendo fallback compatível com
 * chamadas legadas que ainda lançam `Error('CODIGO: mensagem')`.
 */

export type BankingErrorCode =
  | "SALDO_INSUFICIENTE"
  | "ESTORNO_DUPLICADO"
  | "TRANSFERENCIA_INVALIDA"
  | "CONTA_INATIVA";

export interface BankingErrorToast {
  title: string;
  description: string;
}

export class BankingError extends Error {
  readonly code: BankingErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(code: BankingErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = "BankingError";
    this.code = code;
    this.context = context;
    // Preserva prototype para instanceof funcionar após transpile.
    Object.setPrototypeOf(this, BankingError.prototype);
  }
}

const MAP: Record<BankingErrorCode, BankingErrorToast> = {
  SALDO_INSUFICIENTE: {
    title: "Saldo insuficiente",
    description: "A conta bancária não possui saldo suficiente para esta operação.",
  },
  ESTORNO_DUPLICADO: {
    title: "Estorno já realizado",
    description: "Esta movimentação já foi estornada anteriormente.",
  },
  TRANSFERENCIA_INVALIDA: {
    title: "Transferência inválida",
    description: "Verifique as contas de origem e destino — não podem ser iguais e devem estar ativas.",
  },
  CONTA_INATIVA: {
    title: "Conta inativa",
    description: "A conta bancária selecionada está inativa e não aceita movimentações.",
  },
};

const extractCodeFromString = (candidate: string): BankingErrorCode | null => {
  const upper = candidate.toUpperCase();
  const found = (Object.keys(MAP) as BankingErrorCode[]).find((k) => upper.includes(k));
  return found ?? null;
};

const extractCode = (err: unknown): BankingErrorCode | null => {
  // Caminho preferencial: erro estruturado do domínio.
  if (err instanceof BankingError) return err.code;

  if (!err || typeof err !== "object") return null;
  const anyErr = err as Record<string, unknown>;
  const candidate =
    (typeof anyErr.code === "string" && anyErr.code) ||
    (typeof anyErr.name === "string" && anyErr.name) ||
    (typeof anyErr.message === "string" && anyErr.message) ||
    null;
  if (!candidate) return null;
  return extractCodeFromString(candidate);
};

export const mapBankingError = (err: unknown, fallbackTitle = "Erro"): BankingErrorToast => {
  const code = extractCode(err);
  if (code && MAP[code]) return MAP[code];
  const message =
    (err && typeof err === "object" && "message" in err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : null) || "Ocorreu um erro inesperado.";
  return { title: fallbackTitle, description: message };
};
