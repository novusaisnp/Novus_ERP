
-- P5.1: Observabilidade de report_schedule_runs
-- 1) Colunas de auditoria (resign) — schema pronto, sem uso funcional ainda
ALTER TABLE public.report_schedule_runs
  ADD COLUMN IF NOT EXISTS resigned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS resigned_by uuid NULL,
  ADD COLUMN IF NOT EXISTS resign_count integer NOT NULL DEFAULT 0;

-- 2) Índices para consultas 24h
CREATE INDEX IF NOT EXISTS idx_rsr_created_at ON public.report_schedule_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsr_status_created ON public.report_schedule_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rsr_schedule_created ON public.report_schedule_runs (schedule_id, created_at DESC);

-- 3) View: KPIs 24h por scope/format
CREATE OR REPLACE VIEW public.v_report_run_kpis_24h AS
SELECT
  s.scope::text                                                              AS scope,
  s.format::text                                                             AS format,
  COUNT(r.*)                                                                 AS total_runs,
  COUNT(*) FILTER (WHERE r.status = 'succeeded')                             AS succeeded,
  COUNT(*) FILTER (WHERE r.status = 'failed')                                AS failed,
  COUNT(*) FILTER (WHERE r.status = 'running')                               AS running,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE r.status = 'succeeded')
    / NULLIF(COUNT(*) FILTER (WHERE r.status IN ('succeeded','failed')), 0)
  , 2)                                                                       AS success_rate_pct,
  ROUND(
    (percentile_cont(0.95) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) * 1000
    ))::numeric
  , 0)                                                                       AS p95_duration_ms,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (r.finished_at - r.started_at)) * 1000)::numeric
  , 0)                                                                       AS avg_duration_ms
FROM public.report_schedule_runs r
JOIN public.report_schedules s ON s.id = r.schedule_id
WHERE r.created_at >= now() - interval '24 hours'
GROUP BY s.scope, s.format;

-- 4) View: falhas por reason 24h (categoriza pela primeira parte do error_message antes de ':')
CREATE OR REPLACE VIEW public.v_report_run_failures_by_reason_24h AS
SELECT
  COALESCE(
    NULLIF(split_part(r.error_message, ':', 1), ''),
    'unknown'
  )                                        AS reason,
  s.scope::text                            AS scope,
  s.format::text                           AS format,
  COUNT(*)                                 AS failures,
  MAX(r.created_at)                        AS last_seen_at
FROM public.report_schedule_runs r
JOIN public.report_schedules s ON s.id = r.schedule_id
WHERE r.status = 'failed'
  AND r.created_at >= now() - interval '24 hours'
GROUP BY reason, s.scope, s.format
ORDER BY failures DESC;

-- 5) Grants mínimos: leitura para authenticated (RLS das tabelas base continua ativa)
GRANT SELECT ON public.v_report_run_kpis_24h            TO authenticated;
GRANT SELECT ON public.v_report_run_failures_by_reason_24h TO authenticated;
