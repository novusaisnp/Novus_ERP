-- ============================================================================
-- P5.4 — Health Probes (NOVUS ERP / report schedules pipeline)
-- ----------------------------------------------------------------------------
-- Objetivo: diagnóstico rápido (<5 min) de incidentes no pipeline P4.2A/P5.
-- Todas as queries são somente-leitura, sem side-effects.
-- Cada probe declara: PARA QUE SERVE, LIMIAR WARNING, LIMIAR PAGE.
-- Requer role admin (respeita RLS existente) ou service_role em ops.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PROBE 1: v_cron_last_heartbeat
-- Última execução observável do scheduler (proxy = run mais recente criado).
-- USO: verificar se o cron ainda está processando runs.
-- WARNING: heartbeat > 5 min          PAGE: heartbeat > 15 min
-- ---------------------------------------------------------------------------
SELECT
  MAX(started_at)                             AS last_run_started_at,
  now() - MAX(started_at)                     AS heartbeat_lag,
  COUNT(*) FILTER (WHERE started_at >= now() - interval '15 minutes') AS runs_last_15m
FROM public.report_schedule_runs;

-- ---------------------------------------------------------------------------
-- PROBE 2: storage/upload/sign error rate — janela 1h
-- USO: identificar falhas concentradas em storage/signed URL.
-- WARNING: rate >= 5%                  PAGE: rate >= 20%
-- ---------------------------------------------------------------------------
WITH janela AS (
  SELECT status, error_message
  FROM public.report_schedule_runs
  WHERE started_at >= now() - interval '1 hour'
)
SELECT
  COUNT(*)                                                          AS total_runs_1h,
  COUNT(*) FILTER (WHERE status = 'failed')                         AS failed_1h,
  COUNT(*) FILTER (WHERE error_message LIKE 'upload_failed:%')      AS upload_failed_1h,
  COUNT(*) FILTER (WHERE error_message LIKE 'sign_failed:%')        AS sign_failed_1h,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE error_message LIKE 'upload_failed:%'
                                OR error_message LIKE 'sign_failed:%')
      / NULLIF(COUNT(*), 0), 2
  ) AS storage_error_rate_pct
FROM janela;

-- ---------------------------------------------------------------------------
-- PROBE 3: stuck runs (running > X min)
-- USO: detectar runs presos em 'running' sem finished_at.
-- WARNING: idade > 5 min               PAGE: idade > 15 min ou qty > 3
-- ---------------------------------------------------------------------------
SELECT
  id                              AS run_id,
  schedule_id,
  attempt,
  started_at,
  now() - started_at              AS age
FROM public.report_schedule_runs
WHERE status = 'running'
  AND finished_at IS NULL
  AND started_at < now() - interval '5 minutes'
ORDER BY started_at ASC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- PROBE 4: failure spike por reason canônico — janela 15 min
-- Reasons definitivos: invalid_view_state, row_limit_exceeded
-- Reasons transitórios: run_timeout, scope_query_failed, upload_failed,
--                       sign_failed, artifact_generation_failed
-- USO: escolher playbook correto por reason (ver docs/RUNBOOK_P5.md).
-- WARNING: >= 3 falhas mesma reason    PAGE: >= 10 falhas mesma reason
-- ---------------------------------------------------------------------------
SELECT
  split_part(COALESCE(error_message, 'unknown:'), ':', 1) AS reason,
  COUNT(*)                                                AS failures_15m
FROM public.report_schedule_runs
WHERE status = 'failed'
  AND finished_at >= now() - interval '15 minutes'
GROUP BY 1
ORDER BY failures_15m DESC;

-- ---------------------------------------------------------------------------
-- PROBE 5: resign rate-limit saturation — 24h
-- Runs com resign_count próximo do teto (10/dia por run — P5.2).
-- USO: identificar runs que estão sofrendo abuso ou expirando em loop.
-- WARNING: qualquer run com resign_count >= 7
-- PAGE:    qualquer run com resign_count >= 10 (limite atingido)
-- ---------------------------------------------------------------------------
SELECT
  id AS run_id,
  schedule_id,
  resign_count,
  resigned_at,
  signed_url_expires_at
FROM public.report_schedule_runs
WHERE resign_count IS NOT NULL
  AND resign_count >= 7
ORDER BY resign_count DESC, resigned_at DESC NULLS LAST
LIMIT 25;

-- ---------------------------------------------------------------------------
-- PROBE 6: fila de schedules atrasados
-- schedules enabled com next_run_at no passado — o cron deveria estar comendo.
-- USO: cross-check de PROBE 1. Se PROBE 1 diz cron parado E esta lista cresce,
-- confirma incidente de scheduler.
-- WARNING: > 5 schedules atrasados > 5 min  PAGE: > 20 ou atraso > 30 min
-- ---------------------------------------------------------------------------
SELECT
  id AS schedule_id,
  name,
  next_run_at,
  now() - next_run_at AS atraso
FROM public.report_schedules
WHERE enabled = true
  AND next_run_at < now() - interval '5 minutes'
ORDER BY next_run_at ASC
LIMIT 50;
