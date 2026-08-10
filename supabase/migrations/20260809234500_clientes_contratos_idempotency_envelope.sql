
-- Envelope de rastreabilidade/idempotência (mesmo padrão de contas_receber,
-- migration 20260711120808) estendido para clientes e contratos — hoje
-- sincronizados via sync-webhook sem nenhuma proteção contra retry de
-- webhook duplicando linha (achado real: syncContrato faz insert
-- incondicional no branch insert/sync, sem lookup de existência).
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS origem_canal text NULL,
  ADD COLUMN IF NOT EXISTS origem_sistema text NULL,
  ADD COLUMN IF NOT EXISTS externo_id text NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL,
  ADD COLUMN IF NOT EXISTS hash_payload text NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_idempotency_key ON public.clientes(idempotency_key);

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS origem_canal text NULL,
  ADD COLUMN IF NOT EXISTS origem_sistema text NULL,
  ADD COLUMN IF NOT EXISTS externo_id text NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text NULL,
  ADD COLUMN IF NOT EXISTS hash_payload text NULL;

-- contratos, diferente de clientes/contas_receber, não tinha NENHUM dedup
-- (nem por campo de negócio) antes deste fix — índice único fecha a
-- condição de corrida que o lookup-antes-de-insert em código sozinho não
-- fecha (duas chamadas concorrentes do mesmo retry).
CREATE UNIQUE INDEX IF NOT EXISTS ux_contratos_idempotency_key
  ON public.contratos(empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL;
