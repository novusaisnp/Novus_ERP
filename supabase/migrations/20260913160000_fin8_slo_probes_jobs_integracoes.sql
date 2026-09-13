-- FIN-8: SLO real pras duas frentes que ainda não tinham nenhum sinal — "jobs" (os
-- próprios cron jobs do pg_cron, hoje invisíveis: nenhum grant em `cron.*` pra
-- service_role) e reforço de "integrações" (backlog/falha em `webhook_outbox`, a fila
-- de entrega pros satélites). Consumido pelo probe novo em `evaluate-ops-alerts`
-- (P6.2), mesmo padrão dos probes já existentes (heartbeat/stuck_runs/etc.).
--
-- "baixa" (liquidação/estorno/cancelamento) e "conciliação" ficaram de fora desta
-- migration de propósito: hoje não existe nenhum registro de tentativa FALHADA dessas
-- operações (só o resultado bem-sucedido vira `historico_movimentacoes_bancarias`) —
-- não dá pra montar uma taxa de erro sem esse dado existir primeiro. Documentado como
-- pendência explícita, não native probe inventado sobre dado que não reflete a
-- realidade operacional.

-- SECURITY DEFINER porque `cron.job`/`cron.job_run_details` não tem grant nenhum pra
-- service_role/authenticated (schema de extensão, dono é o superusuário) — mesmo motivo
-- de todo outro wrapper SECURITY DEFINER já usado no projeto pra acesso controlado.
CREATE OR REPLACE FUNCTION public.fn_cron_jobs_status()
RETURNS TABLE (jobname text, last_start timestamptz, last_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT j.jobname,
         max(jrd.start_time) AS last_start,
         (array_agg(jrd.status ORDER BY jrd.start_time DESC))[1] AS last_status
  FROM cron.job j
  LEFT JOIN cron.job_run_details jrd ON jrd.jobid = j.jobid
  GROUP BY j.jobname;
$$;

REVOKE ALL ON FUNCTION public.fn_cron_jobs_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_cron_jobs_status() TO service_role;
COMMENT ON FUNCTION public.fn_cron_jobs_status() IS
  'SECURITY DEFINER: expõe status dos pg_cron jobs (cron.job/cron.job_run_details, sem grant direto) só pro service_role — consumido pelo probe de SLO de jobs em evaluate-ops-alerts.';

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.fn_cron_jobs_status()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.fn_cron_jobs_status()', 'EXECUTE') THEN
    RAISE EXCEPTION 'FIN8_SLO_ACL_INVALIDA';
  END IF;
END;
$$;
