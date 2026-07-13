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

/** Retorna o conjunto ativo de `kind` avaliados (usado para auto-resolve). */
export const ALL_ALERT_KINDS = [
  "cron_heartbeat",
  "storage_error_rate",
  "stuck_runs",
  "failure_spike",
  "resign_saturation",
  "behind_schedules",
] as const;
