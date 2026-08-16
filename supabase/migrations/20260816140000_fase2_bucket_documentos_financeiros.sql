-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 2: upload de documento financeiro é 100%
-- simulado (movimentacoesService.uploadDocumento grava url_arquivo falsa,
-- nunca envia ao Storage — comentário original: "implementar quando
-- storage estiver configurado... por enquanto, simular URL"). Cria o
-- bucket privado que faltava, path convention <empresa_id>/<titulo_id>/...,
-- mesmo padrão de 'banco-extratos'.
--
-- Já nasce com a checagem corrigida da Fase 1.5 (has_role_for_empresa, não
-- has_role global) — não reintroduz o bug que acabou de ser fechado.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financeiro-documentos',
  'financeiro-documentos',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "financeiro_documentos_select" ON storage.objects FOR SELECT TO authenticated
        USING (
          bucket_id = 'financeiro-documentos'
          AND (
            public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
            OR public.has_role_for_empresa(auth.uid(), 'admin'::app_role, (storage.foldername(name))[1]::uuid)
          )
        );
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "financeiro_documentos_insert" ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'financeiro-documentos'
          AND (
            public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
            OR public.has_role_for_empresa(auth.uid(), 'admin'::app_role, (storage.foldername(name))[1]::uuid)
          )
        );
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "financeiro_documentos_delete" ON storage.objects FOR DELETE TO authenticated
        USING (
          bucket_id = 'financeiro-documentos'
          AND (
            public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
            OR public.has_role_for_empresa(auth.uid(), 'admin'::app_role, (storage.foldername(name))[1]::uuid)
          )
        );
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
