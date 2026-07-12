-- =========================================================================
-- Rollout V2 — Queries de dashboard operacional
-- Estas queries são parametrizadas via :tenant (uuid) quando aplicável.
-- Rodar em ferramenta com auth admin.
-- =========================================================================

-- 1) dashboard_tenant_24h(:tenant)
-- Volume por hora, por versão de assinatura, com duplicate_rate e p95 skew.
-- :tenant = '11111111-1111-1111-1111-111111111111'
SELECT
  date_trunc('hour', created_at)                                          AS bucket,
  COUNT(*)                                                                AS total,
  COUNT(*) FILTER (WHERE signature_version = 'v1')                        AS v1_count,
  COUNT(*) FILTER (WHERE signature_version = 'v2')                        AS v2_count,
  COUNT(*) FILTER (WHERE outcome = 'duplicate')                           AS duplicate_count,
  COUNT(*) FILTER (WHERE outcome = 'error')                               AS error_count,
  ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'duplicate')
          / NULLIF(COUNT(*),0), 2)                                        AS duplicate_rate_pct,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY ABS(COALESCE(ts_skew_ms,0)))
                                                                          AS p95_ts_skew_ms
FROM public.webhook_deliveries
WHERE empresa_representada_id = :tenant
  AND created_at >= now() - interval '24 hours'
GROUP BY 1
ORDER BY 1;

-- 2) dashboard_migration_7d()
-- Snapshot cross-tenant de estado e volumetria dos últimos 7 dias.
SELECT
  wc.empresa_representada_id,
  wc.nome,
  wc.signature_version                                                    AS state,
  wc.v2_only,
  wc.v2_enforced_at,
  COUNT(wd.*)                                                             AS total_7d,
  COUNT(wd.*) FILTER (WHERE wd.signature_version = 'v1')                  AS v1_7d,
  COUNT(wd.*) FILTER (WHERE wd.signature_version = 'v2')                  AS v2_7d,
  COUNT(wd.*) FILTER (WHERE wd.outcome = 'error')                         AS errors_7d,
  COUNT(wd.*) FILTER (WHERE wd.outcome = 'duplicate')                     AS duplicates_7d
FROM public.webhook_configs wc
LEFT JOIN public.webhook_deliveries wd
  ON wd.empresa_representada_id = wc.empresa_representada_id
 AND wd.source_system = wc.nome
 AND wd.created_at >= now() - interval '7 days'
WHERE wc.ativo = true
GROUP BY wc.empresa_representada_id, wc.nome, wc.signature_version,
         wc.v2_only, wc.v2_enforced_at
ORDER BY wc.signature_version, wc.nome;

-- 3) errors_by_reason_24h(:tenant)
-- Contagem de erros por classe. As "reasons" ficam nos logs estruturados
-- da edge function (Function Logs). Em webhook_deliveries só temos outcome.
-- Esta view aproxima via outcome + inferência por synthetic/ts_skew_ms.
-- Para reasons completas (invalid_v1|invalid_v2|missing_v2|v2_required|
-- timestamp_out_of_window|missing_delivery_id), filtrar Function Logs por
-- request_id e reason.
SELECT
  date_trunc('hour', created_at)                                          AS bucket,
  COUNT(*) FILTER (WHERE outcome = 'error')                               AS errors_generic,
  COUNT(*) FILTER (WHERE outcome = 'duplicate')                           AS duplicates,
  COUNT(*) FILTER (WHERE outcome = 'error' AND signature_version = 'v1')  AS v1_errors,
  COUNT(*) FILTER (WHERE outcome = 'error' AND signature_version = 'v2')  AS v2_errors,
  COUNT(*) FILTER (WHERE ts_skew_ms IS NOT NULL
                     AND ABS(ts_skew_ms) > 300000)                        AS out_of_window,
  COUNT(*) FILTER (WHERE synthetic = true)                                AS synthetic_deliveries
FROM public.webhook_deliveries
WHERE empresa_representada_id = :tenant
  AND created_at >= now() - interval '24 hours'
GROUP BY 1
ORDER BY 1;
