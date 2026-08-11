-- Cadastro Unificado de Entidades — Fase 2c/3 (ERP): envelope de idempotência
-- `clientes` tinha origem_canal/origem_sistema/externo_id/idempotency_key/
-- hash_payload (contrato canônico, CONTRATOS_CANONICOS_ERP.md §5) — não
-- capturado na extensão anterior. Aditivo, entidades ainda vazia.
ALTER TABLE public.entidades
  ADD COLUMN origem_canal text,
  ADD COLUMN origem_sistema text,
  ADD COLUMN externo_id text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN hash_payload text;
