-- P7.3 — Queries canônicas de operação de retenção de artefatos.
-- Todas as queries são SELECT/idempotentes. Sem mutação.
-- Uso: psql $PG* -f supabase/sql/p7_retention_queries.sql

\echo '--- (a) Volume prunado 24h / 7d'
SELECT
  count(*) FILTER (WHERE artifact_pruned_at >= now() - interval '24 hours') AS prunados_24h,
  count(*) FILTER (WHERE artifact_pruned_at >= now() - interval '7 days')  AS prunados_7d,
  count(*) FILTER (WHERE artifact_pruned_at IS NOT NULL)                    AS prunados_total
FROM public.report_schedule_runs;

\echo '--- (b) Elegíveis pendentes para prune (aging > 30 dias, com artefato)'
SELECT
  count(*) AS elegiveis_pendentes,
  min(created_at) AS mais_antigo,
  max(created_at) AS mais_recente
FROM public.report_schedule_runs
WHERE status = 'succeeded'
  AND artifact_path IS NOT NULL
  AND artifact_pruned_at IS NULL
  AND created_at < now() - interval '30 days';

\echo '--- (c) Taxa de erro da função prune por janela (via cron.job_run_details)'
\echo '    Requer privilégios sobre schema "cron" (postgres/service_role).'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    RAISE NOTICE 'schema cron ausente — extensão pg_cron não habilitada';
    RETURN;
  END IF;
  BEGIN
    PERFORM 1 FROM cron.job LIMIT 1;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'sem privilégio no schema cron — rode como postgres/service_role para obter (c)';
    RETURN;
  END;
  RAISE NOTICE 'schema cron acessível — execute manualmente o SELECT abaixo:';
  RAISE NOTICE '  SELECT date_trunc(''hour'', jr.start_time) AS bucket_hour,';
  RAISE NOTICE '         count(*) FILTER (WHERE jr.status = ''succeeded'') AS ok,';
  RAISE NOTICE '         count(*) FILTER (WHERE jr.status = ''failed'')    AS fail,';
  RAISE NOTICE '         count(*) AS total';
  RAISE NOTICE '    FROM cron.job_run_details jr JOIN cron.job j ON j.jobid = jr.jobid';
  RAISE NOTICE '   WHERE j.jobname = ''prune-report-artifacts-daily''';
  RAISE NOTICE '     AND jr.start_time >= now() - interval ''7 days''';
  RAISE NOTICE '   GROUP BY 1 ORDER BY 1 DESC;';
END $$;

\echo '--- (d) Distribuição por reason (retention_expired vs outros)'
SELECT
  COALESCE(artifact_prune_reason, '(null)') AS reason,
  count(*) AS total,
  count(*) FILTER (WHERE artifact_pruned_at >= now() - interval '7 days') AS ultimos_7d
FROM public.report_schedule_runs
WHERE artifact_pruned_at IS NOT NULL
GROUP BY 1
ORDER BY total DESC;

\echo '--- (e) Backlog estimado por idade (elegíveis pendentes por faixa)'
SELECT
  CASE
    WHEN created_at < now() - interval '90 days' THEN 'e_90d_plus'
    WHEN created_at < now() - interval '60 days' THEN 'd_60_90d'
    WHEN created_at < now() - interval '45 days' THEN 'c_45_60d'
    WHEN created_at < now() - interval '30 days' THEN 'b_30_45d'
    ELSE 'a_lt_30d_nao_elegivel'
  END AS faixa,
  count(*) AS runs
FROM public.report_schedule_runs
WHERE status = 'succeeded'
  AND artifact_path IS NOT NULL
  AND artifact_pruned_at IS NULL
GROUP BY 1
ORDER BY 1;
