-- 1) webhook_deliveries
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  source_system text NOT NULL,
  delivery_id text NOT NULL,
  sync_log_id uuid,
  outcome text NOT NULL DEFAULT 'accepted'
    CHECK (outcome IN ('accepted','processed','error','duplicate')),
  synthetic boolean NOT NULL DEFAULT false,
  ts_skew_ms integer,
  execution_time_ms integer,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public' AND t.relname='webhook_deliveries'
      AND c.conname='webhook_deliveries_unique_key'
  ) THEN
    ALTER TABLE public.webhook_deliveries
      ADD CONSTRAINT webhook_deliveries_unique_key
      UNIQUE (empresa_representada_id, source_system, delivery_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS webhook_deliveries_created_at_idx
  ON public.webhook_deliveries (created_at);

GRANT ALL ON public.webhook_deliveries TO service_role;
GRANT SELECT ON public.webhook_deliveries TO authenticated;

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='webhook_deliveries'
      AND policyname='webhook_deliveries admin read'
  ) THEN
    CREATE POLICY "webhook_deliveries admin read"
      ON public.webhook_deliveries FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_webhook_deliveries_updated_at'
  ) THEN
    CREATE TRIGGER update_webhook_deliveries_updated_at
      BEFORE UPDATE ON public.webhook_deliveries
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2) strict_mode em webhook_configs
ALTER TABLE public.webhook_configs
  ADD COLUMN IF NOT EXISTS strict_mode boolean NOT NULL DEFAULT false;

-- 3) delivery_id em sync_logs
ALTER TABLE public.sync_logs
  ADD COLUMN IF NOT EXISTS delivery_id text;

CREATE INDEX IF NOT EXISTS sync_logs_delivery_id_idx
  ON public.sync_logs (delivery_id);