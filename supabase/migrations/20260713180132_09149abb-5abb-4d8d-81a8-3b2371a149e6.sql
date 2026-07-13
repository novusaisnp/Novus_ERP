ALTER TABLE public.bancos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_bancos_deleted_at ON public.bancos(deleted_at) WHERE deleted_at IS NULL;