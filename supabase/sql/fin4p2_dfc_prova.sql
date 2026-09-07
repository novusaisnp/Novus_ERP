-- Prova da DFC método indireto (FIN-4 parte 2, fatia 3) — dado sintético em
-- 2020 (mesma convenção das fatias 1/2, nunca colide com dado real de
-- produção). Cenário desenhado pra isolar cada componente: julho tem aporte
-- de capital + compra de imobilizado à vista + receita à vista + venda a
-- prazo (gera CR) + despesa a pagar (gera CP); agosto tem só depreciação +
-- recebimento parcial do CR + pagamento parcial do CP — sem nenhum
-- lançamento em Caixa fora dos pontos testados, pra poder prever o
-- resultado exato à mão e comparar.

CREATE FUNCTION pg_temp.prova_dfc() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000099';
  v_conta_caixa uuid; v_conta_receita uuid; v_conta_despesa uuid; v_conta_dep uuid;
  v_conta_capital uuid; v_conta_pagar uuid; v_conta_receber uuid; v_conta_imob uuid;
  v_periodo_1 uuid; v_periodo_2 uuid;
  v_lanc_id uuid;
  v_res record;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;

  SELECT id INTO v_conta_caixa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.1.1';
  SELECT id INTO v_conta_receber FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.1.2';
  SELECT id INTO v_conta_imob FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.2.1';
  SELECT id INTO v_conta_receita FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '1.2.1';
  SELECT id INTO v_conta_despesa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '2.1.1';
  SELECT id INTO v_conta_dep FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '2.2.1';
  SELECT id INTO v_conta_capital FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '5.1';
  SELECT id INTO v_conta_pagar FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '4.1.1';

  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-07-15') INTO v_periodo_1;
  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-08-15') INTO v_periodo_2;

  -- ── Julho/2020 ──────────────────────────────────────────────────────
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 930001, '2020-07-01', '2020-07-01', 'TESTE DFC — aporte de capital', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 10000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_capital, 'CREDITO', 10000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 930002, '2020-07-05', '2020-07-05', 'TESTE DFC — compra de imobilizado à vista', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_imob, 'DEBITO', 3000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'CREDITO', 3000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 930003, '2020-07-10', '2020-07-10', 'TESTE DFC — receita à vista', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 2000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receita, 'CREDITO', 2000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 930004, '2020-07-15', '2020-07-15', 'TESTE DFC — venda a prazo', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receber, 'DEBITO', 1500);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receita, 'CREDITO', 1500);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 930005, '2020-07-20', '2020-07-20', 'TESTE DFC — despesa a pagar', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_despesa, 'DEBITO', 800);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_pagar, 'CREDITO', 800);

  -- ── Agosto/2020: só depreciação + recebimento/pagamento parcial ───────
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_2, 930006, '2020-08-05', '2020-08-05', 'TESTE DFC — depreciação', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_dep, 'DEBITO', 150);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor)
    VALUES (v_lanc_id, (SELECT id FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.2.2'), 'CREDITO', 150);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_2, 930007, '2020-08-10', '2020-08-10', 'TESTE DFC — recebimento parcial do CR', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 1000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receber, 'CREDITO', 1000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_2, 930008, '2020-08-15', '2020-08-15', 'TESTE DFC — pagamento parcial do CP', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_pagar, 'DEBITO', 500);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'CREDITO', 500);

  RETURN NEXT 'OK: 8 lançamentos sintéticos criados (5 em julho/2020, 3 em agosto/2020)';

  -- ── 1) acesso negado ────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  BEGIN
    PERFORM * FROM public.relatorio_dfc_indireto(v_empresa_id, '2020-08-01', '2020-08-31');
    RAISE EXCEPTION 'FALHA_DA_PROVA: usuário sem acesso deveria ser bloqueado';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT 'OK: DFC bloqueada para usuário sem acesso à empresa';
      ELSE RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- ── 2) período inválido ─────────────────────────────────────────────
  BEGIN
    PERFORM * FROM public.relatorio_dfc_indireto(v_empresa_id, '2020-08-31', '2020-08-01');
    RAISE EXCEPTION 'FALHA_DA_PROVA: período invertido deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PERIODO_INVALIDO%' THEN
        RETURN NEXT 'OK: período invertido bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 3) Julho isolado — todos os componentes previstos à mão ───────────
  SELECT * INTO v_res FROM public.relatorio_dfc_indireto(v_empresa_id, '2020-07-01', '2020-07-31');
  IF v_res.resultado_periodo <> 2700 OR v_res.depreciacao_amortizacao <> 0
     OR v_res.variacao_contas_receber <> 1500 OR v_res.variacao_contas_pagar <> 800
     OR v_res.fluxo_operacional <> 2000 THEN
    RAISE EXCEPTION 'FCO de julho errado: %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_imobilizado <> 3000 OR v_res.fluxo_investimento <> -3000 THEN
    RAISE EXCEPTION 'FCI de julho errado: %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_patrimonio_liquido <> 10000 OR v_res.fluxo_financiamento <> 10000 THEN
    RAISE EXCEPTION 'FCF de julho errado: %', row_to_json(v_res);
  END IF;
  IF v_res.saldo_caixa_inicial <> 0 OR v_res.saldo_caixa_final <> 9000 OR v_res.variacao_caixa_balanco <> 9000 THEN
    RAISE EXCEPTION 'Saldo de caixa de julho errado: %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_caixa_dfc <> v_res.variacao_caixa_balanco THEN
    RAISE EXCEPTION 'DFC de julho não fecha: dfc=% balanço=%', v_res.variacao_caixa_dfc, v_res.variacao_caixa_balanco;
  END IF;
  RETURN NEXT format('OK: julho — FCO=%s FCI=%s FCF=%s, ΔCaixa=%s (DFC fecha com o Balanço)', v_res.fluxo_operacional, v_res.fluxo_investimento, v_res.fluxo_financiamento, v_res.variacao_caixa_dfc);

  -- ── 4) Agosto isolado (parte do saldo de caixa de julho) ──────────────
  SELECT * INTO v_res FROM public.relatorio_dfc_indireto(v_empresa_id, '2020-08-01', '2020-08-31');
  IF v_res.resultado_periodo <> -150 OR v_res.depreciacao_amortizacao <> 150
     OR v_res.variacao_contas_receber <> -1000 OR v_res.variacao_contas_pagar <> -500
     OR v_res.fluxo_operacional <> 500 THEN
    RAISE EXCEPTION 'FCO de agosto errado: %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_imobilizado <> 0 OR v_res.fluxo_investimento <> 0 THEN
    RAISE EXCEPTION 'FCI de agosto errado (esperava 0, sem compra no mês): %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_patrimonio_liquido <> 0 OR v_res.fluxo_financiamento <> 0 THEN
    RAISE EXCEPTION 'FCF de agosto errado (esperava 0, sem aporte no mês): %', row_to_json(v_res);
  END IF;
  IF v_res.saldo_caixa_inicial <> 9000 OR v_res.saldo_caixa_final <> 9500 OR v_res.variacao_caixa_balanco <> 500 THEN
    RAISE EXCEPTION 'Saldo de caixa de agosto errado: %', row_to_json(v_res);
  END IF;
  IF v_res.variacao_caixa_dfc <> v_res.variacao_caixa_balanco THEN
    RAISE EXCEPTION 'DFC de agosto não fecha: dfc=% balanço=%', v_res.variacao_caixa_dfc, v_res.variacao_caixa_balanco;
  END IF;
  RETURN NEXT format('OK: agosto — saldo inicial 9000 (carrega de julho), FCO=%s (com D&A somado de volta e ΔCR/ΔCP negativos por recebimento/pagamento), ΔCaixa=%s (DFC fecha)', v_res.fluxo_operacional, v_res.variacao_caixa_dfc);

  -- ── 5) Julho+agosto combinado — mesma identidade, período maior ───────
  SELECT * INTO v_res FROM public.relatorio_dfc_indireto(v_empresa_id, '2020-07-01', '2020-08-31');
  IF v_res.saldo_caixa_inicial <> 0 OR v_res.saldo_caixa_final <> 9500 OR v_res.variacao_caixa_dfc <> 9500 THEN
    RAISE EXCEPTION 'DFC combinado (jul+ago) não fecha: %', row_to_json(v_res);
  END IF;
  RETURN NEXT format('OK: julho+agosto combinado — ΔCaixa=%s, DFC fecha com o Balanço', v_res.variacao_caixa_dfc);

  RETURN NEXT 'PROVA DFC COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_dfc();

-- ── limpeza: nenhum resíduo sintético fica no banco real ────────────────
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.lancamentos_contabeis_itens DISABLE TRIGGER trg_validar_balanco_lancamento_contabil;
DELETE FROM public.lancamentos_contabeis_itens WHERE lancamento_id IN (
  SELECT id FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DFC%'
);
DELETE FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DFC%';
ALTER TABLE public.lancamentos_contabeis_itens ENABLE TRIGGER trg_validar_balanco_lancamento_contabil;

SELECT
  (SELECT COUNT(*) FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DFC%') AS lancamentos_residuais,
  (SELECT COUNT(*) FROM public.lancamentos_contabeis_itens i JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id WHERE l.historico LIKE 'TESTE DFC%') AS itens_residuais;
