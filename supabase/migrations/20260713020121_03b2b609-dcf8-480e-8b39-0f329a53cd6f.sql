CREATE TABLE public.report_ops_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('resign','probe_run','alert_ack')),
  actor_user_id uuid NOT NULL,
  target_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_ops_audit_actor_created
  ON public.report_ops_audit (actor_user_id, created_at DESC);

CREATE INDEX idx_report_ops_audit_action_created
  ON public.report_ops_audit (action, created_at DESC);

GRANT SELECT ON public.report_ops_audit TO authenticated;
GRANT ALL ON public.report_ops_audit TO service_role;

ALTER TABLE public.report_ops_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ops audit"
  ON public.report_ops_audit
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own ops audit"
  ON public.report_ops_audit
  FOR SELECT
  TO authenticated
  USING (actor_user_id = auth.uid());