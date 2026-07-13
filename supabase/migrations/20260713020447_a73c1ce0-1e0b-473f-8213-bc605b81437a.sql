CREATE TABLE public.report_ops_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('warning','page')),
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_by uuid NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_report_ops_alerts_open_dedupe
  ON public.report_ops_alerts (kind, reason)
  WHERE resolved_at IS NULL;

CREATE INDEX idx_report_ops_alerts_sev_created
  ON public.report_ops_alerts (severity, created_at DESC);

CREATE INDEX idx_report_ops_alerts_resolved_created
  ON public.report_ops_alerts (resolved_at, created_at DESC);

CREATE TRIGGER trg_report_ops_alerts_updated_at
  BEFORE UPDATE ON public.report_ops_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, UPDATE ON public.report_ops_alerts TO authenticated;
GRANT ALL ON public.report_ops_alerts TO service_role;

ALTER TABLE public.report_ops_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ops alerts"
  ON public.report_ops_alerts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can ack ops alerts"
  ON public.report_ops_alerts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- P6.2 → P6.3: admins podem registrar somente suas próprias ações de alert_ack.
CREATE POLICY "Admins insert own alert_ack audit"
  ON public.report_ops_audit
  FOR INSERT
  TO authenticated
  WITH CHECK (
    action = 'alert_ack'
    AND actor_user_id = auth.uid()
    AND public.has_role(auth.uid(), 'admin')
  );