-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.5: has_role(auth.uid(),'admin') não filtra
-- empresa. Decisão do usuário (2026-08-16): restringir admin à própria
-- empresa. has_role_for_empresa já existe no banco (preserva novus_owner
-- como papel global) e já era usada em 3 policies (contas_receber.cr_update,
-- campos_personalizados_update_admin, preferencias_listagem_update_own) —
-- este sweep estende o mesmo padrão às demais tabelas que têm coluna
-- empresa_representada_id direta e ainda usam o has_role(admin) irrestrito.
--
-- Gerado dinamicamente a partir de pg_policies (catálogo real), não por
-- lista fixa: troca o texto exato 'has_role(auth.uid(), ''admin''::app_role)'
-- por 'has_role_for_empresa(auth.uid(), ''admin''::app_role, empresa_representada_id)'
-- em USING/WITH CHECK, via ALTER POLICY (preserva nome, roles e comando —
-- só troca a expressão).
--
-- Fora deste sweep, tratadas à parte por não terem coluna direta
-- empresa_representada_id: empresas_representadas (id É a empresa),
-- entidade_dados_colaborador (empresa via subquery em entidades),
-- report_ops_alerts/report_ops_audit (dado de plataforma, não de tenant —
-- viram novus_owner, não admin escopado).
--
-- Tabelas revisadas e deixadas como estão, de propósito (catálogo global,
-- sem conceito de empresa): cfop, ncm, papeis_catalogo, entidade_dependencias,
-- modalidades_pagamento, naturezas_pagamento, empresa_responsavel.
-- =====================================================================

DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  alter_sql text;
  old_expr constant text := 'has_role(auth.uid(), ''admin''::app_role)';
  new_expr constant text := 'has_role_for_empresa(auth.uid(), ''admin''::app_role, empresa_representada_id)';
BEGIN
  FOR pol IN
    SELECT p.schemaname, p.tablename, p.policyname, p.qual, p.with_check
    FROM pg_policies p
    JOIN information_schema.columns c
      ON c.table_schema = p.schemaname AND c.table_name = p.tablename AND c.column_name = 'empresa_representada_id'
    WHERE p.schemaname = 'public'
      AND p.tablename NOT IN ('empresas_representadas', 'entidade_dados_colaborador', 'report_ops_alerts', 'report_ops_audit')
      AND (p.qual LIKE '%' || old_expr || '%' OR p.with_check LIKE '%' || old_expr || '%')
  LOOP
    new_qual := NULL;
    new_check := NULL;
    IF pol.qual IS NOT NULL THEN
      new_qual := replace(pol.qual, old_expr, new_expr);
    END IF;
    IF pol.with_check IS NOT NULL THEN
      new_check := replace(pol.with_check, old_expr, new_expr);
    END IF;

    alter_sql := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF new_qual IS NOT NULL THEN
      alter_sql := alter_sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check IS NOT NULL THEN
      alter_sql := alter_sql || format(' WITH CHECK (%s)', new_check);
    END IF;
    EXECUTE alter_sql;
  END LOOP;
END $$;
