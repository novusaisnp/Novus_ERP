
-- 1) Habilita Realtime nas tabelas fiscais
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_documentos_eletronicos;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiscal_eventos;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.fiscal_documentos_eletronicos REPLICA IDENTITY FULL;
ALTER TABLE public.fiscal_eventos REPLICA IDENTITY FULL;

-- 2) Materialized view de métricas fiscais diárias
DROP MATERIALIZED VIEW IF EXISTS public.fiscal_metrics_daily;

CREATE MATERIALIZED VIEW public.fiscal_metrics_daily AS
SELECT
  date_trunc('day', created_at)::date AS dia,
  empresa_representada_id,
  COALESCE(provider, 'none') AS provider,
  status,
  COUNT(*) AS total,
  COALESCE(SUM(valor_total), 0) AS valor_total,
  AVG(EXTRACT(EPOCH FROM (data_autorizacao - data_emissao))) AS latencia_media_s
FROM public.fiscal_documentos_eletronicos
WHERE deleted_at IS NULL
GROUP BY 1, 2, 3, 4;

CREATE UNIQUE INDEX fiscal_metrics_daily_pk
  ON public.fiscal_metrics_daily(dia, empresa_representada_id, provider, status);

REVOKE ALL ON public.fiscal_metrics_daily FROM PUBLIC;
GRANT SELECT ON public.fiscal_metrics_daily TO authenticated;
GRANT ALL ON public.fiscal_metrics_daily TO service_role;

-- 3) Cron: refresh a cada 15 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('fiscal_metrics_daily_refresh');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'fiscal_metrics_daily_refresh',
  '*/15 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.fiscal_metrics_daily$$
);
