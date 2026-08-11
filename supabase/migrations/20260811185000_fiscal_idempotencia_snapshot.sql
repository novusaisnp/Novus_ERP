ALTER TABLE public.fiscal_documentos_eletronicos
  ADD CONSTRAINT fiscal_documentos_idempotency_key UNIQUE (empresa_representada_id, idempotency_key);

ALTER TABLE public.fiscal_documentos_eletronicos_itens
  ADD COLUMN IF NOT EXISTS dados_fiscais jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD CONSTRAINT fiscal_documentos_itens_dados_fiscais_check CHECK (jsonb_typeof(dados_fiscais) = 'object');

CREATE UNIQUE INDEX fiscal_eventos_cce_sequencia_key
  ON public.fiscal_eventos (documento_id, sequencia)
  WHERE tipo = 'cce';

CREATE INDEX fiscal_documentos_empresa_status_idx
  ON public.fiscal_documentos_eletronicos (empresa_representada_id, status, data_emissao DESC)
  WHERE deleted_at IS NULL;
