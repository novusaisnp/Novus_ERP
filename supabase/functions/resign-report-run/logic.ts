// P5.2 — Núcleo puro de autorização/validação para resign-report-run.
// Isolado do runtime HTTP para permitir testes Deno determinísticos.

export const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800
export const MAX_TTL_SECONDS = 7 * 24 * 60 * 60;
export const MAX_RESIGNS_PER_DAY = 10;

export interface RunSummary {
  id: string;
  user_id: string;
  status: string;
  artifact_path: string | null;
  resign_count: number;
  resigned_at: string | null;
}

export type ReasonCode =
  | "not_owner"
  | "not_admin"
  | "run_missing"
  | "artifact_missing"
  | "run_not_succeeded"
  | "ttl_out_of_range"
  | "rate_limited"
  | "invalid_run_id"
  | "invalid_json"
  | "missing_auth";

export interface AuthorizeInput {
  run: RunSummary | null;
  userId: string;
  isAdmin: boolean;
  ttlSecondsRaw?: unknown;
  nowIso: string;
}

export interface AuthorizeSuccess {
  ok: true;
  ttlSeconds: number;
  todayCount: number;
  newResignCount: number;
}

export interface AuthorizeFailure {
  ok: false;
  status: 400 | 403 | 404 | 409 | 422 | 429;
  reason: ReasonCode;
}

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function normalizeTtl(raw: unknown): number | null {
  if (raw === undefined || raw === null) return DEFAULT_TTL_SECONDS;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n <= 0 || n > MAX_TTL_SECONDS) return null;
  return n;
}

/**
 * Aplica todas as regras de autorização/validação P5.2.
 * NÃO faz IO — recebe run já lido e flags já resolvidos.
 */
export function authorizeResign(input: AuthorizeInput): AuthorizeSuccess | AuthorizeFailure {
  const ttl = normalizeTtl(input.ttlSecondsRaw);
  if (ttl === null) return { ok: false, status: 422, reason: "ttl_out_of_range" };

  if (!input.run) return { ok: false, status: 404, reason: "run_missing" };

  const isOwner = input.run.user_id === input.userId;
  if (!isOwner && !input.isAdmin) {
    return { ok: false, status: 403, reason: "not_owner" };
  }

  if (input.run.status !== "succeeded") {
    return { ok: false, status: 409, reason: "run_not_succeeded" };
  }

  if (!input.run.artifact_path) {
    return { ok: false, status: 404, reason: "artifact_missing" };
  }

  const now = new Date(input.nowIso);
  const lastResign = input.run.resigned_at ? new Date(input.run.resigned_at) : null;
  const todayCount = lastResign && sameUtcDay(lastResign, now) ? (input.run.resign_count ?? 0) : 0;

  if (todayCount >= MAX_RESIGNS_PER_DAY) {
    return { ok: false, status: 429, reason: "rate_limited" };
  }

  return {
    ok: true,
    ttlSeconds: ttl,
    todayCount,
    newResignCount: todayCount + 1,
  };
}
