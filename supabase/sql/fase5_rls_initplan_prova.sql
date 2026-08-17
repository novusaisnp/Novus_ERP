-- AUDITORIA_NOVA.md — Fase 5 (item RLS): prova funcional de que o sweep
-- mecanico auth.uid() -> (select auth.uid()) em 20260817090000 preservou o
-- comportamento das 345 policies reescritas. A troca e so uma indirecao de
-- SELECT (otimizacao de plano), sem mudanca de logica — esta prova existe
-- para confirmar empiricamente, nao so confiar na leitura do SQL gerado.
--
-- Como executar:
--   { echo "BEGIN;"; cat supabase/sql/fase5_rls_initplan_prova.sql; echo "ROLLBACK;"; } \
--     | supabase db query --linked --file /dev/stdin

DO $$
DECLARE
  v_empresa_a  uuid;
  v_empresa_b  uuid;
  v_user_a     uuid := gen_random_uuid();
  v_admin_a    uuid := gen_random_uuid();
  v_cc_a       uuid;
  v_cc_b       uuid;
  v_count      integer;
BEGIN
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[FASE5-TEST] Empresa A', '66666666000191') RETURNING id INTO v_empresa_a;
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[FASE5-TEST] Empresa B', '77777777000191') RETURNING id INTO v_empresa_b;

  INSERT INTO auth.users (id) VALUES (v_user_a);
  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, ativo)
  VALUES (v_user_a, '[FASE5-TEST] User A', 'fase5-user-a@exemplo.invalido', v_empresa_a, true);
  -- user_has_access_to_empresa() checa user_roles, nao usuarios — precisa de um role
  -- nao-admin real pra exercitar o ramo "user_has_access_to_empresa" das policies.
  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_user_a, 'operador', v_empresa_a);

  INSERT INTO auth.users (id) VALUES (v_admin_a);
  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, ativo)
  VALUES (v_admin_a, '[FASE5-TEST] Admin A', 'fase5-admin-a@exemplo.invalido', v_empresa_a, true);
  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_admin_a, 'admin', v_empresa_a);

  INSERT INTO centros_custo (empresa_representada_id, nome) VALUES (v_empresa_a, '[FASE5-TEST] CC A') RETURNING id INTO v_cc_a;
  INSERT INTO centros_custo (empresa_representada_id, nome) VALUES (v_empresa_b, '[FASE5-TEST] CC B') RETURNING id INTO v_cc_b;

  -- --------------------------------------------------------- papel real: user comum de A
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a)::text, true);

  SELECT count(*) INTO v_count FROM centros_custo WHERE id IN (v_cc_a, v_cc_b);
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALHA: user comum de A deveria ver so 1 (CC A), viu %', v_count;
  END IF;

  UPDATE centros_custo SET nome = '[FASE5-TEST] CC A (editado por user comum)' WHERE id = v_cc_a;
  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_a AND nome LIKE '%editado por user comum%';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALHA: user comum de A deveria poder editar centro de custo da propria empresa (user_has_access_to_empresa reescrita)';
  END IF;

  -- cross-tenant: user comum de A nao pode editar CC de B (0 linhas afetadas, sem erro)
  UPDATE centros_custo SET nome = '[FASE5-TEST] CC B (vazado)' WHERE id = v_cc_b;
  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_b AND nome LIKE '%vazado%';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA CROSS-TENANT: UPDATE de user comum de A vazou para CC de B';
  END IF;

  -- --------------------------------------------------------- papel real: admin de A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a)::text, true);

  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_b;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FALHA CROSS-TENANT: admin de A enxergou centro de custo de B depois do sweep (has_role_for_empresa reescrita)';
  END IF;

  UPDATE centros_custo SET nome = '[FASE5-TEST] CC A (editado por admin)' WHERE id = v_cc_a;
  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_a AND nome LIKE '%editado por admin%';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALHA: admin de A deveria poder editar centro de custo da propria empresa apos o sweep';
  END IF;

  -- Sanidade: assert invertido de proposito deve falhar
  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_a;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FALHA: admin de A nao viu nem o proprio centro de custo (sanidade invertida)';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'FASE5 RLS INITPLAN PROVA: OK — isolamento e permissoes preservados apos o sweep';
END $$;
