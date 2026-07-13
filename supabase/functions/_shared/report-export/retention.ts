// P7.1 — Configuração de retenção de artefatos de relatórios.
// Consumido por prune-report-artifacts. Não altera geração.

export const RETENTION_DAYS = 30;
export const BATCH_SIZE = 200;
export const RETENTION_REASON = "retention_expired" as const;

export type RetentionReason = typeof RETENTION_REASON;

export function retentionCutoffIso(now: Date = new Date(), days: number = RETENTION_DAYS): string {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}
