-- webhook_configs: governança de assinatura
ALTER TABLE public.webhook_configs
  ADD COLUMN IF NOT EXISTS signature_version text NOT NULL DEFAULT 'v1';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='webhook_configs'
      AND c.conname='webhook_configs_signature_version_chk'
  ) THEN
    ALTER TABLE public.webhook_configs
      ADD CONSTRAINT webhook_configs_signature_version_chk
      CHECK (signature_version IN ('v1','v2','dual'));
  END IF;
END $$;

ALTER TABLE public.webhook_configs
  ADD COLUMN IF NOT EXISTS v2_only boolean NOT NULL DEFAULT false;

ALTER TABLE public.webhook_configs
  ADD COLUMN IF NOT EXISTS v2_enforced_at timestamptz;

-- webhook_deliveries: observabilidade da versão
ALTER TABLE public.webhook_deliveries
  ADD COLUMN IF NOT EXISTS signature_version text;

CREATE INDEX IF NOT EXISTS webhook_deliveries_signature_version_idx
  ON public.webhook_deliveries (signature_version);