-- P8.3 — Rotinas de diagnóstico de manutenção (SOMENTE LEITURA)
-- Uso: psql -f supabase/sql/p8_maintenance_queries.sql
-- Requisitos: papel com leitura em pg_stat_*, pg_stat_activity e extensions.pg_stat_statements.
-- Nada aqui altera dados/estado.

\echo '=========================================='
\echo 'P8.3 — maintenance snapshot @'
SELECT now() AS collected_at;
\echo '=========================================='

-- ------------------------------------------------------------------
-- 1) Bloat aproximado (dead_tup / live_tup) — heurística leve
--    Referência: pg_stat_user_tables. Não substitui pgstattuple.
-- ------------------------------------------------------------------
\echo '--- 1. Bloat estimado (>20% dead) ---'
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup,
  n_dead_tup,
  CASE WHEN n_live_tup = 0 THEN NULL
       ELSE round((n_dead_tup::numeric / GREATEST(n_live_tup,1)) * 100, 2)
  END AS dead_pct,
  last_autovacuum,
  last_vacuum,
  last_autoanalyze,
  last_analyze
FROM pg_stat_user_tables
WHERE n_live_tup > 100
ORDER BY (n_dead_tup::numeric / GREATEST(n_live_tup,1)) DESC
LIMIT 30;

-- ------------------------------------------------------------------
-- 2) Long-running queries (> 30s ativas)
-- ------------------------------------------------------------------
\echo '--- 2. Long-running queries (state=active, > 30s) ---'
SELECT
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  now() - query_start AS running_for,
  substr(regexp_replace(query, '\s+', ' ', 'g'), 1, 200) AS query_snippet
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start IS NOT NULL
  AND now() - query_start > interval '30 seconds'
  AND pid <> pg_backend_pid()
ORDER BY running_for DESC
LIMIT 50;

-- ------------------------------------------------------------------
-- 3) Freshness de estatísticas por tabela crítica
-- ------------------------------------------------------------------
\echo '--- 3. Última ANALYZE por tabela crítica ---'
SELECT
  relname AS table_name,
  n_live_tup,
  last_analyze,
  last_autoanalyze,
  GREATEST(COALESCE(last_analyze,'-infinity'), COALESCE(last_autoanalyze,'-infinity')) AS most_recent_stats,
  now() - GREATEST(COALESCE(last_analyze,'-infinity'), COALESCE(last_autoanalyze,'-infinity')) AS staleness
FROM pg_stat_user_tables
WHERE relname IN (
  'report_schedules','report_schedule_runs',
  'report_ops_alerts','report_ops_audit',
  'contas_pagar','contas_receber','vendas','itens_venda',
  'movimentacoes_bancarias'
)
ORDER BY most_recent_stats ASC NULLS FIRST;

-- ------------------------------------------------------------------
-- 4) Índices não utilizados (idx_scan = 0) — excluindo PK/UNIQUE
-- ------------------------------------------------------------------
\echo '--- 4. Índices não utilizados (idx_scan = 0) ---'
SELECT
  s.schemaname,
  s.relname     AS table_name,
  s.indexrelname AS index_name,
  pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size,
  s.idx_scan,
  s.idx_tup_read,
  s.idx_tup_fetch
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0
  AND NOT i.indisunique
  AND NOT i.indisprimary
  AND s.schemaname = 'public'
ORDER BY pg_relation_size(s.indexrelid) DESC
LIMIT 50;

-- ------------------------------------------------------------------
-- 5) Top statements por tempo total (contexto)
-- ------------------------------------------------------------------
\echo '--- 5. Top 15 statements por total_exec_time ---'
SELECT
  substr(regexp_replace(query, '\s+', ' ', 'g'), 1, 160) AS query_norm,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 2)  AS max_ms,
  round(total_exec_time::numeric, 2) AS total_ms,
  rows
FROM extensions.pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 15;

\echo '=========================================='
\echo 'P8.3 — maintenance snapshot completed'
\echo '=========================================='
