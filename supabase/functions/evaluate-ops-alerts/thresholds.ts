// P6.2 — Núcleo puro: mapeia métricas de probes → alertas (severity/reason).
// Sem I/O. Testável isoladamente.

export type Severity = "warning" | "page";

export interface AlertCandidate {
  kind: string;
  reason: string;
  severity: Severity;
  payload: Record<string, unknown>;
}

// ---------- PROBE 1: heartbeat ----------
export interface HeartbeatInput {
  heartbeatLagSeconds: number | null; // now() - MAX(started_at), em segundos
  runsLast15m: number;
}

export function evalHeartbeat(i: HeartbeatInput): AlertCandidate | null {
  const lag = i.heartbeatLagSeconds ?? Number.POSITIVE_INFINITY;
  if (lag > 900) {
    return {
      kind: "cron_heartbeat",
      reason: "heartbeat_stale",
      severity: "page",
      payload: { heartbeat_lag_seconds: Number.isFinite(lag) ? lag : null, runs_last_15m: i.runsLast15m },
    };
  }
  if (lag > 300) {
    return {
      kind: "cron_heartbeat",
      reason: "heartbeat_slow",
      severity: "warning",
      payload: { heartbeat_lag_seconds: lag, runs_last_15m: i.runsLast15m },
    };
  }
  return null;
}

// ---------- PROBE 2: storage error rate ----------
export interface StorageRateInput {
  totalRuns1h: number;
  storageErrorRatePct: number; // 0..100
}

export function evalStorageRate(i: StorageRateInput): AlertCandidate | null {
  if (i.totalRuns1h < 10) return null; // baixa amostra → sem alerta
  if (i.storageErrorRatePct >= 20) {
    return {
      kind: "storage_error_rate",
      reason: "storage_rate_page",
      severity: "page",
      payload: { rate_pct: i.storageErrorRatePct, total_runs_1h: i.totalRuns1h },
    };
  }
  if (i.storageErrorRatePct >= 5) {
    return {
      kind: "storage_error_rate",
      reason: "storage_rate_warning",
      severity: "warning",
      payload: { rate_pct: i.storageErrorRatePct, total_runs_1h: i.totalRuns1h },
    };
  }
  return null;
}

// ---------- PROBE 3: stuck runs ----------
export interface StuckRunsInput {
  stuckCount: number; // runs em 'running' > 5 min
  oldestAgeSeconds: number | null;
}

export function evalStuckRuns(i: StuckRunsInput): AlertCandidate | null {
  const age = i.oldestAgeSeconds ?? 0;
  if (i.stuckCount > 3 || age > 900) {
    return {
      kind: "stuck_runs",
      reason: "stuck_runs_page",
      severity: "page",
      payload: { stuck_count: i.stuckCount, oldest_age_seconds: age },
    };
  }
  if (i.stuckCount > 0 && age > 300) {
    return {
      kind: "stuck_runs",
      reason: "stuck_runs_warning",
      severity: "warning",
      payload: { stuck_count: i.stuckCount, oldest_age_seconds: age },
    };
  }
  return null;
}

// ---------- PROBE 4: failure spike por reason ----------
export interface FailureSpikeRow { reason: string; failures_15m: number }

export function evalFailureSpikes(rows: FailureSpikeRow[]): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const r of rows) {
    if (r.failures_15m >= 10) {
      out.push({
        kind: "failure_spike",
        reason: `spike_page:${r.reason}`,
        severity: "page",
        payload: { failing_reason: r.reason, failures_15m: r.failures_15m },
      });
    } else if (r.failures_15m >= 3) {
      out.push({
        kind: "failure_spike",
        reason: `spike_warning:${r.reason}`,
        severity: "warning",
        payload: { failing_reason: r.reason, failures_15m: r.failures_15m },
      });
    }
  }
  return out;
}

// ---------- PROBE 5: resign rate-limit saturation ----------
export interface ResignSatInput {
  countAt10: number;
  countAt7: number;
}

export function evalResignSaturation(i: ResignSatInput): AlertCandidate | null {
  if (i.countAt10 > 0) {
    return {
      kind: "resign_saturation",
      reason: "resign_page",
      severity: "page",
      payload: { runs_at_limit: i.countAt10 },
    };
  }
  if (i.countAt7 > 0) {
    return {
      kind: "resign_saturation",
      reason: "resign_warning",
      severity: "warning",
      payload: { runs_near_limit: i.countAt7 },
    };
  }
  return null;
}

// ---------- PROBE 6: schedules atrasados ----------
export interface BehindSchedInput {
  countBehind: number; // atraso > 5 min
  maxDelaySeconds: number | null;
}

export function evalBehindSchedules(i: BehindSchedInput): AlertCandidate | null {
  const delay = i.maxDelaySeconds ?? 0;
  if (i.countBehind > 20 || delay > 1800) {
    return {
      kind: "behind_schedules",
      reason: "behind_page",
      severity: "page",
      payload: { count_behind: i.countBehind, max_delay_seconds: delay },
    };
  }
  if (i.countBehind > 5) {
    return {
      kind: "behind_schedules",
      reason: "behind_warning",
      severity: "warning",
      payload: { count_behind: i.countBehind, max_delay_seconds: delay },
    };
  }
  return null;
}

// ---------- PROBE FISCAL 1: documentos "processando" travados ----------
export interface FiscalStuckInput {
  stuckCount: number; // docs em status='processando' há > 10 min
  oldestAgeSeconds: number | null;
}

export function evalFiscalProcessandoStuck(i: FiscalStuckInput): AlertCandidate | null {
  const age = i.oldestAgeSeconds ?? 0;
  if (i.stuckCount === 0) return null;
  if (i.stuckCount > 5 || age > 1800) {
    return {
      kind: "fiscal_processando_stuck",
      reason: "fiscal_processando_page",
      severity: "page",
      payload: { stuck_count: i.stuckCount, oldest_age_seconds: age },
    };
  }
  return {
    kind: "fiscal_processando_stuck",
    reason: "fiscal_processando_warning",
    severity: "warning",
    payload: { stuck_count: i.stuckCount, oldest_age_seconds: age },
  };
}

// ---------- PROBE FISCAL 2: taxa de rejeição em 1h ----------
export interface FiscalRejeicaoInput {
  autorizadas1h: number;
  rejeitadas1h: number; // inclui rejeitada, denegada, erro
}

export function evalFiscalRejeicaoAlta(i: FiscalRejeicaoInput): AlertCandidate | null {
  const total = i.autorizadas1h + i.rejeitadas1h;
  if (total < 5) return null;
  const pct = Math.round((1000 * i.rejeitadas1h) / total) / 10;
  if (pct >= 20) {
    return {
      kind: "fiscal_rejeicao_alta",
      reason: "fiscal_rejeicao_page",
      severity: "page",
      payload: { rejeicao_pct: pct, total_1h: total, rejeitadas_1h: i.rejeitadas1h },
    };
  }
  if (pct >= 5) {
    return {
      kind: "fiscal_rejeicao_alta",
      reason: "fiscal_rejeicao_warning",
      severity: "warning",
      payload: { rejeicao_pct: pct, total_1h: total, rejeitadas_1h: i.rejeitadas1h },
    };
  }
  return null;
}

// ---------- PROBE FISCAL 3: erros em edge functions fiscais (15 min) ----------
export interface FiscalErroEdgeInput {
  erros15m: number; // eventos tipo 'erro_emissao' | 'erro_cancelamento' | 'erro_cce'
}

export function evalFiscalErroEdge(i: FiscalErroEdgeInput): AlertCandidate | null {
  if (i.erros15m >= 10) {
    return {
      kind: "fiscal_erro_edge",
      reason: "fiscal_erro_edge_page",
      severity: "page",
      payload: { erros_15m: i.erros15m },
    };
  }
  if (i.erros15m >= 3) {
    return {
      kind: "fiscal_erro_edge",
      reason: "fiscal_erro_edge_warning",
      severity: "warning",
      payload: { erros_15m: i.erros15m },
    };
  }
  return null;
}

// ---------- PROBE FISCAL 4: certificado A1 próximo do vencimento ----------
export interface FiscalCertificadoInput {
  expira30d: number; // <30 dias
  expira7d: number;  // <7 dias
}

export function evalFiscalCertificadoExpira(i: FiscalCertificadoInput): AlertCandidate | null {
  if (i.expira7d > 0) {
    return {
      kind: "fiscal_certificado_expira",
      reason: "fiscal_certificado_page",
      severity: "page",
      payload: { expira_7d: i.expira7d, expira_30d: i.expira30d },
    };
  }
  if (i.expira30d > 0) {
    return {
      kind: "fiscal_certificado_expira",
      reason: "fiscal_certificado_warning",
      severity: "warning",
      payload: { expira_30d: i.expira30d },
    };
  }
  return null;
}

// ---------- PROBE JOBS: pg_cron jobs travados/falhando (FIN-8) ----------
// Intervalo esperado de cada job (o schedule real do pg_cron), lido de
// `cron.job.schedule` — 3x esse intervalo sem rodar já é sinal de scheduler travado,
// não só uma execução lenta isolada. Jobs fora desta lista (ex. um job novo) não são
// avaliados — silencioso de propósito até alguém adicionar o intervalo esperado aqui.
export const CRON_JOB_INTERVALO_ESPERADO_SEGUNDOS: Record<string, number> = {
  "process-webhook-outbox": 60,
  "run-report-schedules": 60,
  "evaluate-ops-alerts": 5 * 60,
  "fiscal_metrics_daily_refresh": 15 * 60,
  "cron_refresh_mv_curva_abc": 24 * 3600,
  "job_materializar_recorrencias": 24 * 3600,
  "prune-report-artifacts-daily": 24 * 3600,
};

export interface CronJobInput {
  jobname: string;
  ageSeconds: number | null; // now() - último start_time; null = nunca rodou
  lastStatus: string | null; // 'succeeded' | 'failed' | null
}

export function evalCronJobsStalled(rows: CronJobInput[]): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const row of rows) {
    const intervalo = CRON_JOB_INTERVALO_ESPERADO_SEGUNDOS[row.jobname];
    if (intervalo === undefined) continue;
    const age = row.ageSeconds;
    if (age === null || age > intervalo * 5) {
      out.push({
        kind: "cron_job_stalled",
        reason: `stalled_page:${row.jobname}`,
        severity: "page",
        payload: { jobname: row.jobname, age_seconds: age, intervalo_esperado_seconds: intervalo },
      });
      continue;
    }
    if (age > intervalo * 3) {
      out.push({
        kind: "cron_job_stalled",
        reason: `stalled_warning:${row.jobname}`,
        severity: "warning",
        payload: { jobname: row.jobname, age_seconds: age, intervalo_esperado_seconds: intervalo },
      });
      continue;
    }
    if (row.lastStatus === "failed") {
      out.push({
        kind: "cron_job_stalled",
        reason: `last_run_failed:${row.jobname}`,
        severity: "warning",
        payload: { jobname: row.jobname, age_seconds: age },
      });
    }
  }
  return out;
}

// ---------- PROBE INTEGRAÇÕES: backlog/falhas em webhook_outbox (FIN-8) ----------
export interface WebhookOutboxInput {
  pendentes: number; // status ainda não entregue
  oldestPendingAgeSeconds: number | null;
  falhasRepetidas: number; // tentativas >= 5, ainda não entregue
}

export function evalWebhookOutboxBacklog(i: WebhookOutboxInput): AlertCandidate | null {
  const age = i.oldestPendingAgeSeconds ?? 0;
  if (i.pendentes === 0) return null;
  if (i.pendentes > 100 || age > 3600 || i.falhasRepetidas > 10) {
    return {
      kind: "webhook_outbox_backlog",
      reason: "backlog_page",
      severity: "page",
      payload: { pendentes: i.pendentes, oldest_age_seconds: age, falhas_repetidas: i.falhasRepetidas },
    };
  }
  if (i.pendentes > 20 || age > 900 || i.falhasRepetidas > 0) {
    return {
      kind: "webhook_outbox_backlog",
      reason: "backlog_warning",
      severity: "warning",
      payload: { pendentes: i.pendentes, oldest_age_seconds: age, falhas_repetidas: i.falhasRepetidas },
    };
  }
  return null;
}

/** Retorna o conjunto ativo de `kind` avaliados (usado para auto-resolve). */
export const ALL_ALERT_KINDS = [
  "cron_heartbeat",
  "storage_error_rate",
  "stuck_runs",
  "failure_spike",
  "resign_saturation",
  "behind_schedules",
  "fiscal_processando_stuck",
  "fiscal_rejeicao_alta",
  "fiscal_erro_edge",
  "fiscal_certificado_expira",
  "cron_job_stalled",
  "webhook_outbox_backlog",
] as const;
