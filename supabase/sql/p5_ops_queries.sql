-- P5.1 — Consultas canônicas de operação para report_schedule_runs.
-- Uso em incidente: copie e ajuste janela/schedule_id quando necessário.

-- 1) KPI 24h geral (usar view v_report_run_kpis_24h agrupa por scope/format).
--    Rollup agregado sem quebra por dimensão:
SELECT
  COUNT(*)                                              AS total_runs,
  COUNT(*) FILTER (WHERE status='succeeded')            AS succeeded,
  COUNT(*) FILTER (WHERE status='failed')               AS failed,
  COUNT(*) FILTER (WHERE status='running')              AS running,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status='succeeded')
    / NULLIF(COUNT(*) FILTER (WHERE status IN ('succeeded','failed')),0), 2) AS success_rate_pct,
  ROUND((percentile_cont(0.95) WITHIN GROUP
    (ORDER BY EXTRACT(EPOCH FROM (finished_at - started_at))*1000))::numeric, 0) AS p95_duration_ms
FROM public.report_schedule_runs
WHERE created_at >= now() - interval '24 hours';

-- 2) KPI 24h por scope/format (via view canônica).
SELECT * FROM public.v_report_run_kpis_24h ORDER BY scope, format;

-- 3) Falhas por reason (24h) — usa view canônica.
SELECT * FROM public.v_report_run_failures_by_reason_24h;

-- 4) Runs "running" presos por mais de N minutos (padrão 15) — candidatos a
--    limpeza/retry manual. Ajuste 'interval' conforme SLO.
SELECT id, schedule_id, user_id, attempt, started_at,
       (now() - started_at) AS age
FROM public.report_schedule_runs
WHERE status = 'running'
  AND started_at < now() - interval '15 minutes'
ORDER BY started_at ASC;

-- 5) Cron heartbeat básico — última execução observada em cada schedule ativo.
--    Se 'last_seen' está muito distante do next_run_at, cron pode estar parado.
SELECT s.id AS schedule_id, s.name, s.next_run_at,
       MAX(r.created_at) AS last_run_seen,
       (now() - COALESCE(MAX(r.created_at), s.next_run_at)) AS staleness
FROM public.report_schedules s
LEFT JOIN public.report_schedule_runs r ON r.schedule_id = s.id
WHERE s.enabled = true
GROUP BY s.id, s.name, s.next_run_at
ORDER BY staleness DESC NULLS LAST
LIMIT 50;

-- 6) Drill por schedule_id específico — últimas 50 runs.
--    Substitua ':schedule_id' pelo UUID alvo em ferramentas que não aceitam parâmetros.
-- SELECT id, status, attempt, started_at, finished_at, error_message
-- FROM public.report_schedule_runs
-- WHERE schedule_id = :schedule_id
-- ORDER BY created_at DESC
-- LIMIT 50;
