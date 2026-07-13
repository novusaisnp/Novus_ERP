
-- 1) Revoke EXECUTE on trigger/admin-only SECURITY DEFINER functions from anon/authenticated
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'atualizar_saldo_conta_movimentacao()',
    'bloquear_edicao_orcamento_convertido()',
    'protect_perfis_sistema()',
    'registrar_historico_movimentacao()',
    'validar_classificacao_categoria()',
    'validar_transferencia_movimentacao()',
    'refresh_mv_fluxo_competencia()',
    'materializar_recorrencias(integer)',
    'snapshot_classificacao_venda()',
    'promote_to_dual(uuid,text)',
    'promote_to_v2_only(uuid,text)',
    'rollback_to_dual(uuid,text)',
    'rollback_to_v1(uuid,text)',
    'check_v2_readiness(uuid,text,integer)',
    'precheck_source_system_nome_consistency()'
  ])
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- 2) Rewrite RLS policies that use get_user_empresa_id() equality to use user_has_access_to_empresa()
DO $$
DECLARE
  r record;
  new_qual text;
  new_check text;
  role_list text;
  using_clause text;
  check_clause text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check, permissive
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (COALESCE(qual,'') LIKE '%get_user_empresa_id%' OR COALESCE(with_check,'') LIKE '%get_user_empresa_id%')
  LOOP
    new_qual := r.qual;
    new_check := r.with_check;

    -- Replace patterns like `<alias.>empresa_representada_id = get_user_empresa_id()` with user_has_access_to_empresa(<alias.>empresa_representada_id)
    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '\(([a-zA-Z_][a-zA-Z0-9_]*)\.empresa_representada_id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(\1.empresa_representada_id)', 'g');
      new_qual := regexp_replace(new_qual, '\(empresa_representada_id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(empresa_representada_id)', 'g');
      new_qual := regexp_replace(new_qual, 'empresa_representada_id = get_user_empresa_id\(\)', 'public.user_has_access_to_empresa(empresa_representada_id)', 'g');
      new_qual := regexp_replace(new_qual, '\(id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(id)', 'g');
      new_qual := regexp_replace(new_qual, 'id = get_user_empresa_id\(\)', 'public.user_has_access_to_empresa(id)', 'g');
    END IF;
    IF new_check IS NOT NULL THEN
      new_check := regexp_replace(new_check, '\(([a-zA-Z_][a-zA-Z0-9_]*)\.empresa_representada_id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(\1.empresa_representada_id)', 'g');
      new_check := regexp_replace(new_check, '\(empresa_representada_id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(empresa_representada_id)', 'g');
      new_check := regexp_replace(new_check, 'empresa_representada_id = get_user_empresa_id\(\)', 'public.user_has_access_to_empresa(empresa_representada_id)', 'g');
      new_check := regexp_replace(new_check, '\(id = get_user_empresa_id\(\)\)', 'public.user_has_access_to_empresa(id)', 'g');
      new_check := regexp_replace(new_check, 'id = get_user_empresa_id\(\)', 'public.user_has_access_to_empresa(id)', 'g');
    END IF;

    -- Skip if still contains get_user_empresa_id (unhandled pattern) — leave policy unchanged
    IF (new_qual IS NOT NULL AND new_qual LIKE '%get_user_empresa_id%')
       OR (new_check IS NOT NULL AND new_check LIKE '%get_user_empresa_id%') THEN
      CONTINUE;
    END IF;

    role_list := array_to_string(r.roles, ', ');
    using_clause := CASE WHEN new_qual IS NOT NULL THEN ' USING (' || new_qual || ')' ELSE '' END;
    check_clause := CASE WHEN new_check IS NOT NULL THEN ' WITH CHECK (' || new_check || ')' ELSE '' END;

    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      r.policyname, r.tablename,
      r.permissive,
      r.cmd,
      role_list,
      using_clause,
      check_clause
    );
  END LOOP;
END $$;

-- 3) rateios_contas_receber: restrict policies from public to authenticated
DO $$
DECLARE
  r record;
  using_clause text;
  check_clause text;
BEGIN
  FOR r IN
    SELECT policyname, cmd, permissive, qual, with_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename='rateios_contas_receber'
  LOOP
    using_clause := CASE WHEN r.qual IS NOT NULL THEN ' USING (' || r.qual || ')' ELSE '' END;
    check_clause := CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' || r.with_check || ')' ELSE '' END;
    EXECUTE format('DROP POLICY %I ON public.rateios_contas_receber', r.policyname);
    EXECUTE format(
      'CREATE POLICY %I ON public.rateios_contas_receber AS %s FOR %s TO authenticated%s%s',
      r.policyname, r.permissive, r.cmd, using_clause, check_clause
    );
  END LOOP;
END $$;

-- 4) webhook_deliveries: add tenant-scoped write policies (admin-only writes; service_role bypasses RLS)
DROP POLICY IF EXISTS "webhook_deliveries admin insert" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "webhook_deliveries admin update" ON public.webhook_deliveries;
DROP POLICY IF EXISTS "webhook_deliveries admin delete" ON public.webhook_deliveries;

CREATE POLICY "webhook_deliveries admin insert" ON public.webhook_deliveries
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "webhook_deliveries admin update" ON public.webhook_deliveries
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "webhook_deliveries admin delete" ON public.webhook_deliveries
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
