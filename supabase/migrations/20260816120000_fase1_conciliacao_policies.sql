-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.1: recriar as 14 policies de conciliação
-- bancária. Migration 20260713174159 declarava-as; sumiram do banco real
-- (provável sequela da migração de projeto lrkebsznehpuascgqbri ->
-- reksodqzemboaeqxnxyy em 2026-08-08). RLS ligada + zero policies =
-- SELECT vazio sem erro, escrita falha com 42501. Confirmado ao vivo
-- contra o banco antes desta migration.
--
-- Idempotente: DO $$ ... EXCEPTION WHEN duplicate_object, mesmo padrão
-- já usado em 20260713224846 (fiscal storage policies), porque
-- Postgres não aceita CREATE POLICY IF NOT EXISTS.
-- =====================================================================

DO $$
BEGIN
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bei_select" ON public.banco_extratos_importados FOR SELECT TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bei_insert" ON public.banco_extratos_importados FOR INSERT TO authenticated
        WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bei_update" ON public.banco_extratos_importados FOR UPDATE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bei_delete" ON public.banco_extratos_importados FOR DELETE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bme_select" ON public.banco_movimentacoes_extrato FOR SELECT TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bme_insert" ON public.banco_movimentacoes_extrato FOR INSERT TO authenticated
        WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bme_update" ON public.banco_movimentacoes_extrato FOR UPDATE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bme_delete" ON public.banco_movimentacoes_extrato FOR DELETE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "brc_select" ON public.banco_regras_conciliacao FOR SELECT TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "brc_insert" ON public.banco_regras_conciliacao FOR INSERT TO authenticated
        WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "brc_update" ON public.banco_regras_conciliacao FOR UPDATE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "brc_delete" ON public.banco_regras_conciliacao FOR DELETE TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bcl_select" ON public.banco_conciliacao_log FOR SELECT TO authenticated
        USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "bcl_insert" ON public.banco_conciliacao_log FOR INSERT TO authenticated
        WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- Sem policies de UPDATE/DELETE em banco_conciliacao_log: log é imutável
  -- para usuários finais, por desenho (mesma decisão da migration original).
END $$;

-- entidade_id_map: verificado contra 20260810230000 — RLS habilitada sem
-- nenhuma policy é intencional e documentada ali ("tabela de trabalho da
-- Fase 2, só service_role acessa"). Nenhuma ação necessária aqui.
