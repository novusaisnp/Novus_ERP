-- Prova da DMPL (FIN-4 parte 2, fatia 2) — dado sintético lançado direto em
-- lancamentos_contabeis/itens, datas em 2020 (mesma convenção da fatia 1,
-- nunca colide com dado real de produção que só começa em 2026).
-- Sem BEGIN/ROLLBACK — limpeza manual no final do arquivo.

CREATE FUNCTION pg_temp.prova_dmpl() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000099';
  v_conta_caixa uuid; v_conta_receita uuid; v_conta_despesa uuid; v_conta_pagar uuid; v_conta_capital uuid;
  v_periodo_1 uuid; v_periodo_2 uuid;
  v_lanc_id uuid;
  v_saldo_ini numeric; v_mov numeric; v_saldo_fim numeric;
  v_bal_jun numeric; v_bal_jul numeric;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;

  SELECT id INTO v_conta_caixa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.1.1';
  SELECT id INTO v_conta_receita FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '1.2.1';
  SELECT id INTO v_conta_despesa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '2.1.1';
  SELECT id INTO v_conta_pagar FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '4.1.1';
  SELECT id INTO v_conta_capital FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '5.1';

  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-06-15') INTO v_periodo_1;
  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-07-15') INTO v_periodo_2;

  -- ── Junho/2020: aporte 5.000, receita 3.000, despesa 1.000 ────────────
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 910001, '2020-06-10', '2020-06-10', 'TESTE DMPL — aporte de capital (jun)', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 5000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_capital, 'CREDITO', 5000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 910002, '2020-06-20', '2020-06-20', 'TESTE DMPL — receita (jun)', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 3000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receita, 'CREDITO', 3000);

  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 910003, '2020-06-25', '2020-06-25', 'TESTE DMPL — despesa (jun)', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_despesa, 'DEBITO', 1000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_pagar, 'CREDITO', 1000);

  -- ── Julho/2020: segundo aporte 2.000 (sem novo resultado no mês) ──────
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_2, 910004, '2020-07-05', '2020-07-05', 'TESTE DMPL — aporte de capital (jul)', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 2000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_capital, 'CREDITO', 2000);

  RETURN NEXT 'OK: 4 lançamentos sintéticos criados (3 em junho/2020, 1 em julho/2020)';

  -- ── 1) acesso negado ────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  BEGIN
    PERFORM * FROM public.relatorio_dmpl(v_empresa_id, '2020-07-01', '2020-07-31');
    RAISE EXCEPTION 'FALHA_DA_PROVA: usuário sem acesso deveria ser bloqueado';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT 'OK: DMPL bloqueada para usuário sem acesso à empresa';
      ELSE RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- ── 2) período inválido ─────────────────────────────────────────────
  BEGIN
    PERFORM * FROM public.relatorio_dmpl(v_empresa_id, '2020-07-31', '2020-07-01');
    RAISE EXCEPTION 'FALHA_DA_PROVA: período invertido deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PERIODO_INVALIDO%' THEN
        RETURN NEXT 'OK: período invertido bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 3) Capital Social em julho: saldo inicial 5000, movimento 2000, final 7000 ──
  SELECT saldo_inicial, movimento_periodo, saldo_final
    INTO v_saldo_ini, v_mov, v_saldo_fim
    FROM public.relatorio_dmpl(v_empresa_id, '2020-07-01', '2020-07-31') WHERE conta_id = v_conta_capital;
  IF v_saldo_ini <> 5000 OR v_mov <> 2000 OR v_saldo_fim <> 7000 THEN
    RAISE EXCEPTION 'Capital Social errado: inicial=% mov=% final=% (esperado 5000/2000/7000)', v_saldo_ini, v_mov, v_saldo_fim;
  END IF;
  RETURN NEXT 'OK: Capital Social em julho — inicial=5000, movimento=2000 (aporte do mês), final=7000';

  -- ── 4) Resultado do Período em julho: inicial 2000 (jun), sem movimento, final 2000 ──
  SELECT saldo_inicial, movimento_periodo, saldo_final
    INTO v_saldo_ini, v_mov, v_saldo_fim
    FROM public.relatorio_dmpl(v_empresa_id, '2020-07-01', '2020-07-31') WHERE conta_id IS NULL;
  IF v_saldo_ini <> 2000 OR v_mov <> 0 OR v_saldo_fim <> 2000 THEN
    RAISE EXCEPTION 'Resultado do Período errado: inicial=% mov=% final=% (esperado 2000/0/2000)', v_saldo_ini, v_mov, v_saldo_fim;
  END IF;
  RETURN NEXT 'OK: Resultado do Período em julho — inicial=2000 (receita-despesa de junho), sem movimento no mês, final=2000';

  -- ── 5) Reconciliação: saldo_final de cada conta bate com o Balanço em 31/07 ──
  SELECT COALESCE(SUM(saldo), 0) INTO v_bal_jul FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-07-31') WHERE tipo = 'PATRIMONIO';
  SELECT COALESCE(SUM(saldo_final), 0) INTO v_saldo_fim FROM public.relatorio_dmpl(v_empresa_id, '2020-07-01', '2020-07-31');
  IF v_bal_jul <> v_saldo_fim THEN
    RAISE EXCEPTION 'DMPL não reconcilia com o Balanço em 31/07: Balanço PL=% DMPL saldo_final total=%', v_bal_jul, v_saldo_fim;
  END IF;
  RETURN NEXT format('OK: soma de saldo_final da DMPL (%s) reconcilia com o total de PATRIMONIO do Balanço em 31/07 (%s)', v_saldo_fim, v_bal_jul);

  -- ── 6) Reconciliação: saldo_inicial de cada conta bate com o Balanço em 30/06 ──
  SELECT COALESCE(SUM(saldo), 0) INTO v_bal_jun FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-06-30') WHERE tipo = 'PATRIMONIO';
  SELECT COALESCE(SUM(saldo_inicial), 0) INTO v_saldo_ini FROM public.relatorio_dmpl(v_empresa_id, '2020-07-01', '2020-07-31');
  IF v_bal_jun <> v_saldo_ini THEN
    RAISE EXCEPTION 'DMPL não reconcilia com o Balanço em 30/06: Balanço PL=% DMPL saldo_inicial total=%', v_bal_jun, v_saldo_ini;
  END IF;
  RETURN NEXT format('OK: soma de saldo_inicial da DMPL (%s) reconcilia com o total de PATRIMONIO do Balanço em 30/06 (%s)', v_saldo_ini, v_bal_jun);

  RETURN NEXT 'PROVA DMPL COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_dmpl();

-- ── limpeza: nenhum resíduo sintético fica no banco real ────────────────
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.lancamentos_contabeis_itens DISABLE TRIGGER trg_validar_balanco_lancamento_contabil;
DELETE FROM public.lancamentos_contabeis_itens WHERE lancamento_id IN (
  SELECT id FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DMPL%'
);
DELETE FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DMPL%';
ALTER TABLE public.lancamentos_contabeis_itens ENABLE TRIGGER trg_validar_balanco_lancamento_contabil;

SELECT
  (SELECT COUNT(*) FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE DMPL%') AS lancamentos_residuais,
  (SELECT COUNT(*) FROM public.lancamentos_contabeis_itens i JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id WHERE l.historico LIKE 'TESTE DMPL%') AS itens_residuais;
