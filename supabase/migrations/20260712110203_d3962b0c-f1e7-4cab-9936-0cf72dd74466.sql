DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'webhook_configs_empresa_nome_key'
      AND n.nspname = 'public'
      AND t.relname = 'webhook_configs'
  ) THEN
    ALTER TABLE public.webhook_configs
      ADD CONSTRAINT webhook_configs_empresa_nome_key
      UNIQUE (empresa_representada_id, nome);
  END IF;
END $$;