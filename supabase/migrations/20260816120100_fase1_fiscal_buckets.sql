-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.2: criar os buckets de Storage fiscais.
-- Código (fiscal-emitir-nfe, fiscal-consultar-nfe, fiscal-upload-certificado,
-- fiscal-signed-url) referencia fiscal-xml/fiscal-danfe/fiscal-certificados/
-- fiscal-sped desde 2026-07-13; as policies em storage.objects já existem
-- (20260713224846: fiscal_storage_admin_*), mas os buckets nunca foram
-- criados ("criados via ferramenta separada" — nunca aconteceu). Qualquer
-- caminho fiscal fora do modo mock quebraria ao tentar persistir.
--
-- fiscal-certificados espelha exatamente a validação já aplicada em
-- fiscal-upload-certificado/index.ts: só .pfx/.p12, MAX_BYTES = 512KB.
-- Os demais ficam sem allowed_mime_types: o content-type de XML/DANFE/SPED
-- vem do provedor fiscal em tempo real e não deve ser travado aqui.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('fiscal-certificados', 'fiscal-certificados', false, 524288, ARRAY['application/x-pkcs12']),
  ('fiscal-xml',          'fiscal-xml',          false, 5242880, NULL),
  ('fiscal-danfe',        'fiscal-danfe',        false, 5242880, NULL),
  ('fiscal-sped',         'fiscal-sped',         false, 20971520, NULL)
ON CONFLICT (id) DO NOTHING;
