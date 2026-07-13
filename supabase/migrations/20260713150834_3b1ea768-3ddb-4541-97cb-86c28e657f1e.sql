ALTER TABLE public.report_schedule_runs
  ADD COLUMN IF NOT EXISTS artifact_pruned_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS artifact_prune_reason text NULL;

CREATE INDEX IF NOT EXISTS idx_report_runs_prune_eligible
  ON public.report_schedule_runs (status, created_at)
  WHERE artifact_pruned_at IS NULL AND artifact_path IS NOT NULL;