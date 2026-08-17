-- AUDITORIA_NOVA Fase 5 (item 3/3, escopo Fluxo de Caixa) — verificação:
-- fn_fluxo_caixa_resumo/fn_fluxo_caixa_projecao devem reproduzir exatamente
-- os números que fluxoCaixaService.ts calculava em JS (SUMs sobre
-- contas_pagar/contas_receber/liquidacoes_titulos + saldo bancário),
-- incluindo a distinção PREVISTO/REALIZADO via liquidação e os três
-- horizontes de projeção (7/14/30d, ancorados em CURRENT_DATE).
--
-- Como executar:
--   { echo "BEGIN;"; cat supabase/sql/fase5_fluxo_caixa_agregacao_prova.sql; echo "ROLLBACK;"; } \
--     | supabase db query --linked --file /dev/stdin

DO $$
DECLARE
  v_empresa   uuid;
  v_user      uuid := gen_random_uuid();
  v_saida_prevista_id uuid;
  v_saida_realizada_id uuid;
  v_entrada_prevista_id uuid;
  v_entrada_realizada_id uuid;
  r RECORD;
BEGIN
  SELECT id INTO v_empresa FROM empresas_representadas LIMIT 1;
  ASSERT v_empresa IS NOT NULL, 'precisa de ao menos 1 empresa real para o teste';

  INSERT INTO auth.users (id) VALUES (v_user);
  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, ativo)
  VALUES (v_user, '[FASE5-FCX-TEST] Usuario', 'fase5-fcx-test@exemplo.invalido', v_empresa, true);
  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_user, 'operador', v_empresa);

  -- Saldo bancário conhecido, isolado das contas reais (soma de todas as
  -- ativas da empresa entraria no cálculo — zera as existentes dentro da
  -- transação, sem impacto fora do ROLLBACK).
  UPDATE contas_bancarias SET ativo = false WHERE empresa_representada_id = v_empresa;
  INSERT INTO contas_bancarias (empresa_representada_id, numero_conta, saldo_atual, ativo, conta_cofre)
  VALUES (v_empresa, '[FASE5-FCX-TEST]', 10000, true, true);

  -- SAIDA prevista: vence hoje+3 (dentro dos 3 horizontes)
  INSERT INTO contas_pagar (empresa_representada_id, descricao, numero_documento, valor_original, data_vencimento, status)
  VALUES (v_empresa, '[FASE5-FCX-TEST] saida prevista', 'T1', 1000, CURRENT_DATE + 3, 'PENDENTE')
  RETURNING id INTO v_saida_prevista_id;

  -- SAIDA realizada: liquidada em hoje+10 (fora do horizonte 7d, dentro de 14/30d)
  INSERT INTO contas_pagar (empresa_representada_id, descricao, numero_documento, valor_original, data_vencimento, status)
  VALUES (v_empresa, '[FASE5-FCX-TEST] saida realizada', 'T2', 500, CURRENT_DATE - 5, 'PAGO')
  RETURNING id INTO v_saida_realizada_id;
  INSERT INTO liquidacoes_titulos (empresa_representada_id, conta_pagar_id, data_liquidacao, valor_pago, cancelada)
  VALUES (v_empresa, v_saida_realizada_id, CURRENT_DATE + 10, 480, false);

  -- ENTRADA prevista: vence hoje+20 (fora de 7/14d, dentro de 30d)
  INSERT INTO contas_receber (empresa_representada_id, descricao, numero_documento, valor_original, data_vencimento, status)
  VALUES (v_empresa, '[FASE5-FCX-TEST] entrada prevista', 'T3', 2000, CURRENT_DATE + 20, 'PENDENTE')
  RETURNING id INTO v_entrada_prevista_id;

  -- ENTRADA realizada: liquidada em hoje+40 (fora dos 3 horizontes de projeção,
  -- mas ainda dentro da janela ampla data_inicio/data_fim do teste)
  INSERT INTO contas_receber (empresa_representada_id, descricao, numero_documento, valor_original, data_vencimento, status)
  VALUES (v_empresa, '[FASE5-FCX-TEST] entrada realizada', 'T4', 1500, CURRENT_DATE - 5, 'RECEBIDO')
  RETURNING id INTO v_entrada_realizada_id;
  INSERT INTO liquidacoes_titulos (empresa_representada_id, conta_receber_id, data_liquidacao, valor_pago, cancelada)
  VALUES (v_empresa, v_entrada_realizada_id, CURRENT_DATE + 40, 1500, false);

  -- Papel real: usuário comum com acesso à empresa (mesmo mecanismo de
  -- fase1_5_admin_isolamento_prova.sql)
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  SELECT * INTO r FROM fn_fluxo_caixa_resumo(
    v_empresa, CURRENT_DATE - 60, CURRENT_DATE + 60,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL
  );

  RAISE NOTICE 'resumo: total_entradas=% total_saidas=% saldo_atual=% proj7=% proj14=% proj30=% capital_giro=% runway=% saldo_min=%',
    r.total_entradas, r.total_saidas, r.saldo_atual,
    r.saldo_projetado_7d, r.saldo_projetado_14d, r.saldo_projetado_30d,
    r.capital_giro, r.runway_dias, r.saldo_minimo;

  ASSERT r.total_entradas = 3500, 'total_entradas esperado 3500, veio ' || r.total_entradas;
  ASSERT r.total_saidas = 1480, 'total_saidas esperado 1480, veio ' || r.total_saidas;
  ASSERT r.saldo_atual = 11020, 'saldo_atual esperado 11020 (10000 banco + 1500 entrada realizada - 480 saida realizada), veio ' || r.saldo_atual;
  ASSERT r.saldo_projetado_7d = 10020, 'saldo_projetado_7d esperado 10020 (11020 - 1000 da saida em +3d), veio ' || r.saldo_projetado_7d;
  ASSERT r.saldo_projetado_14d = 9540, 'saldo_projetado_14d esperado 9540 (11020 - 1000 - 480, +3d e +10d), veio ' || r.saldo_projetado_14d;
  ASSERT r.saldo_projetado_30d = 11540, 'saldo_projetado_30d esperado 11540 (11020 - 1000 - 480 + 2000, +3/+10/+20d), veio ' || r.saldo_projetado_30d;
  ASSERT r.capital_giro = 7714.00, 'capital_giro esperado 7714.00 (70% de 11020), veio ' || r.capital_giro;
  ASSERT r.runway_dias = 223, 'runway_dias esperado 223 (floor(11020/(1480/30))), veio ' || r.runway_dias;

  RAISE NOTICE 'ok fn_fluxo_caixa_resumo: todos os valores batem com o calculo manual';

  -- Filtro tipo_movimento = SAIDA: só as duas saidas devem contar.
  SELECT * INTO r FROM fn_fluxo_caixa_resumo(
    v_empresa, CURRENT_DATE - 60, CURRENT_DATE + 60,
    'SAIDA', NULL, NULL, NULL, NULL, NULL, NULL
  );
  ASSERT r.total_entradas = 0, 'filtro SAIDA deveria zerar total_entradas, veio ' || r.total_entradas;
  ASSERT r.total_saidas = 1480, 'filtro SAIDA deveria manter total_saidas em 1480, veio ' || r.total_saidas;
  RAISE NOTICE 'ok filtro tipo_movimento=SAIDA isola as saidas corretamente';

  -- Filtro status = REALIZADO: só T2 (saida) e T4 (entrada) devem contar.
  SELECT * INTO r FROM fn_fluxo_caixa_resumo(
    v_empresa, CURRENT_DATE - 60, CURRENT_DATE + 60,
    NULL, 'REALIZADO', NULL, NULL, NULL, NULL, NULL
  );
  ASSERT r.total_entradas = 1500, 'filtro REALIZADO deveria dar total_entradas=1500, veio ' || r.total_entradas;
  ASSERT r.total_saidas = 480, 'filtro REALIZADO deveria dar total_saidas=480, veio ' || r.total_saidas;
  RAISE NOTICE 'ok filtro status=REALIZADO isola as liquidadas corretamente';

  -- Projeção dia a dia (45 dias, cobre os 4 lançamentos)
  SELECT saidas_previstas INTO r.total_saidas FROM fn_fluxo_caixa_projecao(v_empresa, 45) WHERE data = CURRENT_DATE + 3;
  ASSERT r.total_saidas = 1000, 'projecao dia +3 esperava saida=1000 (T1 previsto), veio ' || r.total_saidas;

  SELECT saidas_previstas INTO r.total_saidas FROM fn_fluxo_caixa_projecao(v_empresa, 45) WHERE data = CURRENT_DATE + 10;
  ASSERT r.total_saidas = 480, 'projecao dia +10 esperava saida=480 (T2 liquidado), veio ' || r.total_saidas;

  SELECT entradas_previstas INTO r.total_entradas FROM fn_fluxo_caixa_projecao(v_empresa, 45) WHERE data = CURRENT_DATE + 20;
  ASSERT r.total_entradas = 2000, 'projecao dia +20 esperava entrada=2000 (T3 previsto), veio ' || r.total_entradas;

  SELECT entradas_previstas INTO r.total_entradas FROM fn_fluxo_caixa_projecao(v_empresa, 45) WHERE data = CURRENT_DATE + 40;
  ASSERT r.total_entradas = 1500, 'projecao dia +40 esperava entrada=1500 (T4 liquidado), veio ' || r.total_entradas;

  RAISE NOTICE 'ok fn_fluxo_caixa_projecao: valores diarios batem em todos os pontos verificados';

  -- Controle de acesso: usuário sem vínculo com a empresa não pode chamar.
  DECLARE
    v_outro uuid := gen_random_uuid();
    v_erro text;
  BEGIN
    RESET ROLE;
    INSERT INTO auth.users (id) VALUES (v_outro);
    SET LOCAL ROLE authenticated;
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_outro)::text, true);
    BEGIN
      PERFORM * FROM fn_fluxo_caixa_resumo(v_empresa, CURRENT_DATE - 60, CURRENT_DATE + 60, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
      RAISE EXCEPTION 'E1: usuario sem vinculo NAO deveria conseguir chamar fn_fluxo_caixa_resumo';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
      ASSERT v_erro NOT LIKE 'E1:%', v_erro;
      RAISE NOTICE 'ok: acesso negado para usuario sem vinculo com a empresa (%)', v_erro;
    END;
  END;

  RAISE NOTICE '=== FASE 5 fluxo de caixa: prova completa, todos os asserts passaram ===';
END $$;
