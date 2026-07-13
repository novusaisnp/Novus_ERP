// Catálogo compartilhado de reasons canônicos para runs de relatório (P5.3).
// Consumido por run-report-schedules e por dashboards de observabilidade (P5.1).

export const KNOWN_REASONS = [
  "invalid_view_state",
  "scope_query_failed",
  "row_limit_exceeded",
  "run_timeout",
  "artifact_generation_failed",
  "upload_failed",
  "sign_failed",
  "delivery_skipped",
] as const;

export type ReportRunReason = typeof KNOWN_REASONS[number];

const KNOWN_SET = new Set<string>(KNOWN_REASONS);

/** Reasons DEFINITIVOS — não retentam mesmo com attempt < MAX_ATTEMPTS. */
const DEFINITIVE_REASONS = new Set<string>([
  "invalid_view_state",
  "row_limit_exceeded",
]);

export function classifyReason(rawMessage: string): { reason: ReportRunReason | "unknown"; detail: string } {
  const prefix = rawMessage.split(":")[0]?.trim() ?? "";
  const reason = KNOWN_SET.has(prefix) ? (prefix as ReportRunReason) : "unknown";
  const detail = rawMessage.includes(":") ? rawMessage.slice(rawMessage.indexOf(":") + 1) : rawMessage;
  return { reason, detail };
}

/** Retornar true = falha definitiva (sem retry). false = transitório (respeita backoff). */
export function isDefinitive(reason: ReportRunReason | "unknown"): boolean {
  return DEFINITIVE_REASONS.has(reason);
}
