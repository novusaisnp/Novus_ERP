-- P8.1 — Baseline de performance (SOMENTE LEITURA)
-- Coleta métricas "antes" para queries críticas P5–P7.
-- Requisitos:
--   * extensão pg_stat_statements habilitada (validado em P8.1).
--   * papel com privilégio de leitura em pg_stat_statements e views de sistema.
-- Uso:
--   psql -f supabase/sql/p8_baseline_queries.sql
-- Observações:
--   * Nenhuma query aqui altera dados/estado.
--   * EXPLAIN é ANALYZE em blocos DO $$ para evitar output volumoso — capture
--     manualmente ao investigar candidatos a índice (P8.2).

\echo '=========================================='
\echo 'P8.1 — Baseline snapshot @'
SELECT now() AS collected_at;
\echo '=========================================='

-- ------------------------------------------------------------------
-- 0) Pré-requisito: pg_stat_statements
-- ------------------------------------------------------------------
\echo '--- 0. pg_stat_statements status ---'
SELECT extname, extversion
  FROM pg_extension
 WHERE extname = 'pg_stat_statements';

-- ------------------------------------------------------------------
-- 1) p50 / p95 / mean por query normalizada
--    Filtra somente statements que tocam as tabelas críticas P5–P7.
-- ------------------------------------------------------------------
\echo '--- 1. Latency by normalized query (critical tables) ---'
SELECT
  substr(regexp_replace(query, '\s+', ' ', 'g'), 1, 160) AS query_norm,
  calls,
  round(mean_exec_time::numeric, 2)   AS mean_ms,
  round((total_exec_time / NULLIF(calls,0))::numeric, 2) AS avg_ms,
  round(max_exec_time::numeric, 2)    AS max_ms,
  round(total_exec_time::numeric, 2)  AS total_ms,
  rows
FROM extensions.pg_stat_statements
WHERE query ~* '(report_schedule_runs|report_schedules|report_ops_alerts|report_ops_audit|report-exports)'
ORDER BY total_exec_time DESC
LIMIT 30;

-- Aproximação de p50/p95 a partir de mean/stddev (pg_stat_statements não
-- expõe percentis nativos). Interpretar como estimativa gaussiana.
\echo '--- 1b. Approx p50/p95 (mean +/- 1.645*stddev) ---'
SELECT
  substr(regexp_replace(query, '\s+', ' ', 'g'), 1, 120) AS query_norm,
  calls,
  round(mean_exec_time::numeric, 2)                              AS p50_ms_approx,
  round((mean_exec_time + 1.645 * stddev_exec_time)::numeric, 2) AS p95_ms_approx
FROM extensions.pg_stat_statements
WHERE query ~* '(report_schedule_runs|report_schedules|report_ops_alerts|report_ops_audit)'
  AND calls > 5
ORDER BY p95_ms_approx DESC NULLS LAST
LIMIT 30;

-- ------------------------------------------------------------------
-- 2) Cache hit ratio por tabela crítica
-- ------------------------------------------------------------------
\echo '--- 2. Cache hit ratio (per critical table) ---'
SELECT
  relname AS table_name,
  heap_blks_read,
  heap_blks_hit,
  CASE WHEN (heap_blks_hit + heap_blks_read) = 0 THEN NULL
       ELSE round((heap_blks_hit::numeric / (heap_blks_hit + heap_blks_read)) * 100, 2)
  END AS hit_ratio_pct
FROM pg_statio_user_tables
WHERE relname IN (
  'report_schedules', 'report_schedule_runs',
  'report_ops_alerts', 'report_ops_audit'
)
ORDER BY relname;

-- ------------------------------------------------------------------
-- 3) Uso de índices por tabela crítica
-- ------------------------------------------------------------------
\echo '--- 3. Index usage (per critical table) ---'
SELECT
  relname AS table_name,
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch,
  n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE relname IN (
  'report_schedules', 'report_schedule_runs',
  'report_ops_alerts', 'report_ops_audit'
)
ORDER BY relname;

\echo '--- 3b. Índices existentes (definições) ---'
SELECT schemaname, tablename, indexname, indexdef
  FROM pg_indexes
 WHERE tablename IN (
   'report_schedules', 'report_schedule_runs',
   'report_ops_alerts', 'report_ops_audit'
 )
 ORDER BY tablename, indexname;

-- ------------------------------------------------------------------
-- 4) Tamanho das tabelas críticas (subsídio para P8.2)
-- ------------------------------------------------------------------
\echo '--- 4. Table sizes ---'
SELECT
  c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid))       AS table_size,
  pg_size_pretty(pg_indexes_size(c.oid))        AS indexes_size,
  c.reltuples::bigint                           AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'report_schedules', 'report_schedule_runs',
    'report_ops_alerts', 'report_ops_audit'
  )
ORDER BY pg_total_relation_size(c.oid) DESC;

-- ------------------------------------------------------------------
-- 5) EXPLAIN (ANALYZE, BUFFERS) — queries críticas representativas
--    Encapsulado em DO para permitir execução em lote sem falhar caso
--    a tabela esteja vazia; ver logs do servidor para plano completo.
-- ------------------------------------------------------------------
\echo '--- 5. EXPLAIN ANALYZE (representative critical queries) ---'

-- 5.a RelatoriosOps: KPIs 24h
\echo '5.a report_ops_kpis_24h (últimos 24h)'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT status, COUNT(*) AS total
  FROM public.report_schedule_runs
 WHERE created_at >= now() - interval '24 hours'
 GROUP BY status;

-- 5.b RelatoriosOps: falhas 24h
\echo '5.b report_ops_failures_24h'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, schedule_id, status, error_message, created_at
  FROM public.report_schedule_runs
 WHERE created_at >= now() - interval '24 hours'
   AND status IN ('failed'::report_run_status)
 ORDER BY created_at DESC
 LIMIT 200;

-- 5.c RelatoriosOps: listagem filtrada (P6.4)
\echo '5.c report_runs filtrada'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, schedule_id, status, created_at, artifact_pruned_at
  FROM public.report_schedule_runs
 WHERE created_at >= now() - interval '24 hours'
 ORDER BY created_at DESC
 LIMIT 200;

-- 5.d Schedule list (P5/P7.2)
\echo '5.d schedules + last runs'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT s.id, s.name, s.enabled, s.created_at,
       (SELECT r.status
          FROM public.report_schedule_runs r
         WHERE r.schedule_id = s.id
         ORDER BY r.created_at DESC
         LIMIT 1) AS last_status
  FROM public.report_schedules s
 ORDER BY s.created_at DESC
 LIMIT 100;

-- 5.e Alerts 24h (P5.3)
\echo '5.e report_ops_alerts 24h'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, kind, severity, created_at
  FROM public.report_ops_alerts
 WHERE created_at >= now() - interval '24 hours'
 ORDER BY created_at DESC
 LIMIT 200;

-- 5.f Audit trail (P5.4)
\echo '5.f report_ops_audit recent'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, actor_user_id, action, created_at
  FROM public.report_ops_audit
 WHERE created_at >= now() - interval '7 days'
 ORDER BY created_at DESC
 LIMIT 200;

-- 5.g Retention: elegíveis pendentes (>30d) — referência P7.3
\echo '5.g retention eligible'
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT id, schedule_id, created_at
  FROM public.report_schedule_runs
 WHERE status = 'succeeded'
   AND artifact_path IS NOT NULL
   AND artifact_pruned_at IS NULL
   AND created_at < now() - interval '30 days'
 ORDER BY created_at ASC
 LIMIT 200;

\echo '=========================================='
\echo 'P8.1 — baseline collection completed'
\echo '=========================================='
