-- P4.2A — Agendamento de relatórios (schema base, sem envio de e-mail)

-- Enums
CREATE TYPE public.report_schedule_frequency AS ENUM ('daily','weekly','monthly');
CREATE TYPE public.report_schedule_scope AS ENUM ('vendas','financeiro');
CREATE TYPE public.report_export_format AS ENUM ('xlsx','pdf','csv');
CREATE TYPE public.report_run_status AS ENUM ('pending','running','succeeded','failed');

-- =====================================================================
-- Tabela: report_schedules
-- =====================================================================
CREATE TABLE public.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope public.report_schedule_scope NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  format public.report_export_format NOT NULL,
  frequency public.report_schedule_frequency NOT NULL,
  hour_utc SMALLINT NOT NULL CHECK (hour_utc BETWEEN 0 AND 23),
  day_of_week SMALLINT CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
  day_of_month SMALLINT CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 28),
  view_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[]
    CHECK (array_length(recipients, 1) IS NULL OR array_length(recipients, 1) <= 5),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_schedules_next_run
  ON public.report_schedules(next_run_at)
  WHERE enabled = true;
CREATE INDEX idx_report_schedules_user
  ON public.report_schedules(user_id, scope);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_schedules TO authenticated;
GRANT ALL ON public.report_schedules TO service_role;

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own report schedules select" ON public.report_schedules
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own report schedules insert" ON public.report_schedules
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own report schedules update" ON public.report_schedules
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own report schedules delete" ON public.report_schedules
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_report_schedules_updated_at
  BEFORE UPDATE ON public.report_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- Tabela: report_schedule_runs
-- =====================================================================
CREATE TABLE public.report_schedule_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.report_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status public.report_run_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  artifact_path TEXT,
  signed_url TEXT,
  signed_url_expires_at TIMESTAMPTZ,
  delivery_status TEXT CHECK (delivery_status IN ('sent','skipped','failed')),
  delivery_message_id TEXT,
  delivery_reason TEXT,
  error_message TEXT,
  attempt SMALLINT NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 3),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_runs_schedule
  ON public.report_schedule_runs(schedule_id, started_at DESC);
CREATE INDEX idx_report_runs_user
  ON public.report_schedule_runs(user_id, started_at DESC);

-- Runs são gravados apenas por edge function via service_role.
-- Usuários autenticados apenas leem os próprios (sem INSERT/UPDATE/DELETE policy).
GRANT SELECT ON public.report_schedule_runs TO authenticated;
GRANT ALL ON public.report_schedule_runs TO service_role;

ALTER TABLE public.report_schedule_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own report runs select" ON public.report_schedule_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
