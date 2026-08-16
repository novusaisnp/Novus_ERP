-- AUDITORIA_NOVA.md — Fase 1.5, verificação: prova de que 'admin' deixou de
-- atravessar empresas depois de 20260816130000/20260816130100. Estende o
-- cenário de supabase/sql/fin0_isolamento_entre_empresas.sql (que testava
-- isolamento entre usuários comuns) com o caso que faltava: admin da
-- empresa A contra dados da empresa B.
--
-- Como executar:
--   { echo "BEGIN;"; cat supabase/sql/fase1_5_admin_isolamento_prova.sql; echo "ROLLBACK;"; } \
--     | supabase db query --linked --file /dev/stdin

DO $$
DECLARE
  v_empresa_a  uuid;
  v_empresa_b  uuid;
  v_admin_a    uuid := gen_random_uuid();
  v_cc_a       uuid;
  v_cc_b       uuid;
  v_count      integer;
  v_erro       text;
BEGIN
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[FASE1.5-TEST] Empresa A', '44444444000191') RETURNING id INTO v_empresa_a;
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[FASE1.5-TEST] Empresa B', '55555555000191') RETURNING id INTO v_empresa_b;

  INSERT INTO auth.users (id) VALUES (v_admin_a);
  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, ativo)
  VALUES (v_admin_a, '[FASE1.5-TEST] Admin A', 'fase15-admin-a@exemplo.invalido', v_empresa_a, true);
  -- admin só de A, não novus_owner — exatamente o perfil dos 4 admins reais hoje.
  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_admin_a, 'admin', v_empresa_a);

  INSERT INTO centros_custo (empresa_representada_id, nome) VALUES (v_empresa_a, '[FASE1.5-TEST] CC A') RETURNING id INTO v_cc_a;
  INSERT INTO centros_custo (empresa_representada_id, nome) VALUES (v_empresa_b, '[FASE1.5-TEST] CC B') RETURNING id INTO v_cc_b;

  -- --------------------------------------------------------- papel real: admin de A
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin_a)::text, true);

  -- Sweep mecânico (has_role_for_empresa): admin de A não deveria enxergar
  -- centro de custo de B. Antes da Fase 1.5, has_role(admin) global fazia o
  -- admin de A enxergar e editar TODAS as empresas.
  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_a;
  ASSERT v_count = 1, 'admin A deveria ver o proprio centro de custo, viu ' || v_count;

  SELECT count(*) INTO v_count FROM centros_custo WHERE id = v_cc_b;
  ASSERT v_count = 0, 'admin A NAO deveria enxergar centro de custo da empresa B, viu ' || v_count;

  UPDATE centros_custo SET nome = '[FASE1.5-TEST] invadido' WHERE id = v_cc_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'UPDATE cross-tenant em centros_custo deveria afetar 0 linhas, afetou ' || v_count;

  RAISE NOTICE 'ok sweep mecanico: admin de empresa A nao alcanca centro de custo de empresa B';

  -- --------------------------------------------------------- caso especial: empresas_representadas
  SELECT count(*) INTO v_count FROM empresas_representadas WHERE id = v_empresa_a;
  ASSERT v_count = 1, 'admin A deveria ver a propria empresa, viu ' || v_count;

  SELECT count(*) INTO v_count FROM empresas_representadas WHERE id = v_empresa_b;
  ASSERT v_count = 0, 'admin A NAO deveria enxergar a empresa B, viu ' || v_count;

  UPDATE empresas_representadas SET nome = '[FASE1.5-TEST] invadido' WHERE id = v_empresa_b;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'UPDATE cross-tenant em empresas_representadas deveria afetar 0 linhas, afetou ' || v_count;

  -- admin (mesmo da propria empresa) nao e novus_owner: nem cria nem apaga tenant.
  BEGIN
    INSERT INTO empresas_representadas (nome, cnpj) VALUES ('[FASE1.5-TEST] Empresa C', '66666666000191');
    RAISE EXCEPTION 'E1: admin comum nao deveria conseguir criar uma nova empresa';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    ASSERT v_erro NOT LIKE 'E1:%', v_erro;
    RAISE NOTICE 'ok: INSERT de nova empresa recusado para admin comum (%)', v_erro;
  END;

  -- DELETE sob RLS nao levanta excecao quando a policy USING filtra a linha
  -- de fora — so afeta 0 linhas, diferente de INSERT (WITH CHECK levanta erro real).
  DELETE FROM empresas_representadas WHERE id = v_empresa_a; -- a PROPRIA empresa
  GET DIAGNOSTICS v_count = ROW_COUNT;
  ASSERT v_count = 0, 'DELETE de empresa (mesmo a propria) deveria afetar 0 linhas para admin comum, afetou ' || v_count;
  RAISE NOTICE 'ok: DELETE de empresa (mesmo a propria) recusado para admin comum (0 linhas afetadas)';

  RAISE NOTICE 'ok caso especial: admin nao atravessa empresas_representadas nem cria/apaga tenant';
END $$;
