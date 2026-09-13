-- Contingência offline para NFC-e (fecha o item "Fiscal completo" da Onda 1 do Plano Mestre).
-- CCe e consulta de status já existiam; só faltava contingência.

ALTER TABLE public.fiscal_documentos_eletronicos
  ADD COLUMN IF NOT EXISTS forma_emissao text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS codigo_unico_contingencia text;

ALTER TABLE public.fiscal_documentos_eletronicos
  ADD CONSTRAINT fiscal_documentos_forma_emissao_check CHECK (forma_emissao IN ('normal', 'contingencia'));

ALTER TABLE public.fiscal_documentos_eletronicos
  DROP CONSTRAINT fiscal_documentos_status_check,
  ADD CONSTRAINT fiscal_documentos_status_check CHECK (status IN (
    'RASCUNHO', 'EM_PROCESSAMENTO', 'AUTORIZADA', 'DENEGADA', 'REJEITADA',
    'CANCELADA', 'INUTILIZADA', 'ENCERRADA', 'FALHA_COMUNICACAO'
  ));

ALTER TABLE public.fiscal_configuracoes
  ADD COLUMN IF NOT EXISTS serie_nfce_contingencia integer NOT NULL DEFAULT 900;

ALTER TABLE public.fiscal_configuracoes
  ADD CONSTRAINT fiscal_configuracoes_serie_nfce_contingencia_check
    CHECK (serie_nfce_contingencia BETWEEN 1 AND 999);

COMMENT ON COLUMN public.fiscal_documentos_eletronicos.forma_emissao IS
  'normal = emitida online direto na SEFAZ; contingencia = emitida offline (forma_emissao=offline na Focus) por indisponibilidade da SEFAZ/provedor, sincroniza sozinha depois.';
COMMENT ON COLUMN public.fiscal_documentos_eletronicos.codigo_unico_contingencia IS
  'cNF informado manualmente quando forma_emissao=contingencia (obrigatório pela Focus nesse modo).';
COMMENT ON COLUMN public.fiscal_configuracoes.serie_nfce_contingencia IS
  'Série reservada só para NFC-e emitida em contingência, nunca usada no fluxo online, para nunca colidir com a numeração sequencial normal.';
