CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('process_webhook_outbox');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'process_webhook_outbox',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://reksodqzemboaeqxnxyy.supabase.co/functions/v1/process-webhook-outbox',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'novus_erp_anon_key'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $cron$
);
