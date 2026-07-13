-- P7.1 — Agendamento operacional do prune diário de artefatos de relatórios.
-- NÃO executar via migration (contém URL de projeto + anon key).
-- Executar manualmente pelo operador em Cloud → SQL Editor.
--
-- Requisitos: extensões pg_cron e pg_net habilitadas.
-- Rodar 1x/dia às 03:15 UTC (fora das janelas de run-report-schedules/evaluate-ops-alerts).

select
  cron.schedule(
    'prune-report-artifacts-daily',
    '15 3 * * *',
    $$
    select
      net.http_post(
        url := 'https://vypjygroqljchdselzqm.supabase.co/functions/v1/prune-report-artifacts',
        headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5cGp5Z3JvcWxqY2hkc2VsenFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzkyOTEsImV4cCI6MjA5OTI1NTI5MX0.1HEa5vLORph8E2qzPX3vQ1Fv43Kruitai9iTzE8Mols"}'::jsonb,
        body := jsonb_build_object('trigger', 'cron', 'ts', now())
      );
    $$
  );

-- Para inspecionar:
--   select * from cron.job where jobname = 'prune-report-artifacts-daily';
-- Para remover:
--   select cron.unschedule('prune-report-artifacts-daily');
