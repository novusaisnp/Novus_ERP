-- Requer dois segredos no Vault antes de aplicar:
--   novus_erp_anon_key (já existente)
--   novus_internal_function_secret (mesmo valor do Edge Secret INTERNAL_FUNCTION_SECRET)

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
  ) OR NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
  ) THEN
    RAISE NOTICE 'Crons Edge não agendados: configure novus_internal_function_secret e novus_erp_anon_key no Vault';
  END IF;
END;
$$;

DO $$
DECLARE
  v_job record;
BEGIN
  FOR v_job IN
    SELECT jobid
    FROM cron.job
    WHERE command LIKE ANY (ARRAY[
      '%functions/v1/process-webhook-outbox%',
      '%functions/v1/run-report-schedules%',
      '%functions/v1/evaluate-ops-alerts%',
      '%functions/v1/prune-report-artifacts%'
    ])
      AND EXISTS (
        SELECT 1 FROM vault.decrypted_secrets
        WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
      )
      AND EXISTS (
        SELECT 1 FROM vault.decrypted_secrets
        WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
      )
  LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'process-webhook-outbox',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://reksodqzemboaeqxnxyy.supabase.co/functions/v1/process-webhook-outbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_erp_anon_key' LIMIT 1),
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_internal_function_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
)
WHERE EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
) AND EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
);

SELECT cron.schedule(
  'run-report-schedules',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://reksodqzemboaeqxnxyy.supabase.co/functions/v1/run-report-schedules',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_erp_anon_key' LIMIT 1),
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_internal_function_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
)
WHERE EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
) AND EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
);

SELECT cron.schedule(
  'evaluate-ops-alerts',
  '*/5 * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://reksodqzemboaeqxnxyy.supabase.co/functions/v1/evaluate-ops-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_erp_anon_key' LIMIT 1),
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_internal_function_secret' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 55000
    );
  $job$
)
WHERE EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
) AND EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
);

SELECT cron.schedule(
  'prune-report-artifacts-daily',
  '15 3 * * *',
  $job$
    SELECT net.http_post(
      url := 'https://reksodqzemboaeqxnxyy.supabase.co/functions/v1/prune-report-artifacts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_erp_anon_key' LIMIT 1),
        'x-internal-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'novus_internal_function_secret' LIMIT 1)
      ),
      body := jsonb_build_object('trigger', 'cron', 'ts', now()),
      timeout_milliseconds := 55000
    );
  $job$
)
WHERE EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_internal_function_secret' AND decrypted_secret <> ''
) AND EXISTS (
  SELECT 1 FROM vault.decrypted_secrets
  WHERE name = 'novus_erp_anon_key' AND decrypted_secret <> ''
);
