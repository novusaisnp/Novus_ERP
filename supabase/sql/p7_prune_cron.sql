-- Compatibilidade operacional: o agendamento canônico agora vive na migration
-- 20260907212000_p0_crons_edge_autorizados.sql e exige o segredo interno.

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command LIKE '%functions/v1/prune-report-artifacts%';

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
      body := jsonb_build_object('trigger', 'cron', 'ts', now())
    );
  $job$
);
