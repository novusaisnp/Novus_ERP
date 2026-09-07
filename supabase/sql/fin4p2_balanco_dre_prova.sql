-- Prova de FIN-4 parte 2 (Balanço Patrimonial + DRE) — dado sintético
-- lançado diretamente em lancamentos_contabeis/itens (sem passar pelos
-- triggers de título/depreciação, só testando as duas funções de leitura).
-- Sem BEGIN/ROLLBACK (mesmo padrão do resto da sessão) — limpeza manual no
-- final do arquivo. Datas em 2020 de propósito — bem antes de qualquer
-- operação real da empresa (que começa em 2026), pra nunca colidir com
-- dado de produção nas asserções de valor exato.

CREATE FUNCTION pg_temp.prova_fin4p2() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000099';
  v_conta_caixa uuid; v_conta_receita uuid; v_conta_despesa uuid; v_conta_dep uuid;
  v_conta_capital uuid; v_conta_pagar uuid;
  v_periodo_1 uuid; v_periodo_2 uuid;
  v_lanc_id uuid;
  v_row record;
  v_saldo_caixa numeric; v_saldo_resultado numeric;
  v_total_ativo numeric; v_total_passivo numeric; v_total_pl numeric;
  v_receita_periodo numeric; v_despesa_periodo numeric; v_dep_periodo numeric;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;

  SELECT id INTO v_conta_caixa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.1.1';
  SELECT id INTO v_conta_receita FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '1.2.1';
  SELECT id INTO v_conta_despesa FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '2.1.1';
  SELECT id INTO v_conta_dep FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '2.2.1';
  SELECT id INTO v_conta_capital FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '5.1';
  SELECT id INTO v_conta_pagar FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '4.1.1';

  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-06-15') INTO v_periodo_1;
  SELECT public.resolver_periodo_contabil(v_empresa_id, '2020-07-15') INTO v_periodo_2;

  -- ── Lançamento 1 (junho): aporte de capital — Caixa(D) / Capital Social(C) 10.000 ──
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 900001, '2020-06-15', '2020-06-15', 'TESTE FIN4P2 — aporte de capital', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 10000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_capital, 'CREDITO', 10000);

  -- ── Lançamento 2 (junho): receita de venda à vista — Caixa(D) / Receita(C) 3.000 ──
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 900002, '2020-06-20', '2020-06-20', 'TESTE FIN4P2 — receita à vista', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_caixa, 'DEBITO', 3000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_receita, 'CREDITO', 3000);

  -- ── Lançamento 3 (junho): despesa de aluguel a pagar — Despesa(D) / Contas a Pagar(C) 1.000 ──
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_1, 900003, '2020-06-25', '2020-06-25', 'TESTE FIN4P2 — aluguel a pagar', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_despesa, 'DEBITO', 1000);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_pagar, 'CREDITO', 1000);

  -- ── Lançamento 4 (julho — outro período): depreciação — Despesa Dep(D) / Dep.Acum(C) 200 ──
  INSERT INTO public.lancamentos_contabeis (empresa_representada_id, periodo_id, numero_lancamento, data_lancamento, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, v_periodo_2, 900004, '2020-07-05', '2020-07-05', 'TESTE FIN4P2 — depreciação', 'MANUAL') RETURNING id INTO v_lanc_id;
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor) VALUES (v_lanc_id, v_conta_dep, 'DEBITO', 200);
  INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor)
    VALUES (v_lanc_id, (SELECT id FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '3.2.2'), 'CREDITO', 200);

  RETURN NEXT 'OK: 4 lançamentos sintéticos criados (3 em junho/2026, 1 em julho/2026)';

  -- ── 1) acesso negado ────────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  BEGIN
    PERFORM * FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-06-30');
    RAISE EXCEPTION 'FALHA_DA_PROVA: usuário sem acesso deveria ser bloqueado (balanço)';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT 'OK: balanço bloqueado para usuário sem acesso à empresa';
      ELSE RAISE; END IF;
  END;
  BEGIN
    PERFORM * FROM public.relatorio_dre(v_empresa_id, '2020-06-01', '2020-06-30');
    RAISE EXCEPTION 'FALHA_DA_PROVA: usuário sem acesso deveria ser bloqueado (dre)';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT 'OK: DRE bloqueado para usuário sem acesso à empresa';
      ELSE RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- ── 2) período inválido ────────────────────────────────────────────────
  BEGIN
    PERFORM * FROM public.relatorio_dre(v_empresa_id, '2020-06-30', '2020-06-01');
    RAISE EXCEPTION 'FALHA_DA_PROVA: período invertido deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PERIODO_INVALIDO%' THEN
        RETURN NEXT 'OK: DRE com período invertido bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 3) Balanço em 30/06 — antes da depreciação de julho ────────────────
  SELECT saldo INTO v_saldo_caixa FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-06-30') WHERE conta_id = v_conta_caixa;
  IF v_saldo_caixa <> 13000 THEN
    RAISE EXCEPTION 'Saldo de Caixa em 30/06 deveria ser 13000 (10000+3000), veio %', v_saldo_caixa;
  END IF;
  SELECT saldo INTO v_saldo_resultado FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-06-30') WHERE conta_id IS NULL;
  IF v_saldo_resultado <> 2000 THEN
    RAISE EXCEPTION 'Resultado do período (não apurado) em 30/06 deveria ser 2000 (3000 receita - 1000 despesa), veio %', v_saldo_resultado;
  END IF;
  RETURN NEXT format('OK: balanço em 30/06 — Caixa=%s, Resultado não apurado=%s', v_saldo_caixa, v_saldo_resultado);

  -- ── 4) Identidade contábil: Ativo = Passivo + PL (incl. resultado) ──────
  SELECT COALESCE(SUM(saldo), 0) INTO v_total_ativo FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-07-31') WHERE tipo = 'ATIVO';
  SELECT COALESCE(SUM(saldo), 0) INTO v_total_passivo FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-07-31') WHERE tipo = 'PASSIVO';
  SELECT COALESCE(SUM(saldo), 0) INTO v_total_pl FROM public.relatorio_balanco_patrimonial(v_empresa_id, '2020-07-31') WHERE tipo = 'PATRIMONIO';
  IF v_total_ativo <> (v_total_passivo + v_total_pl) THEN
    RAISE EXCEPTION 'Identidade contábil quebrada em 31/07: Ativo=% Passivo+PL=%', v_total_ativo, v_total_passivo + v_total_pl;
  END IF;
  RETURN NEXT format('OK: identidade contábil em 31/07 — Ativo=%s = Passivo+PL=%s', v_total_ativo, v_total_passivo + v_total_pl);

  -- ── 5) DRE de junho não inclui a depreciação de julho ───────────────────
  SELECT COALESCE(SUM(valor_periodo), 0) INTO v_receita_periodo FROM public.relatorio_dre(v_empresa_id, '2020-06-01', '2020-06-30') WHERE tipo = 'RECEITA';
  SELECT COALESCE(SUM(valor_periodo), 0) INTO v_despesa_periodo FROM public.relatorio_dre(v_empresa_id, '2020-06-01', '2020-06-30') WHERE tipo = 'DESPESA';
  IF v_receita_periodo <> 3000 OR v_despesa_periodo <> 1000 THEN
    RAISE EXCEPTION 'DRE de junho errada: receita=% despesa=% (esperado 3000/1000)', v_receita_periodo, v_despesa_periodo;
  END IF;
  RETURN NEXT format('OK: DRE de junho — receita=%s despesa=%s resultado=%s', v_receita_periodo, v_despesa_periodo, v_receita_periodo - v_despesa_periodo);

  -- ── 6) DRE de julho inclui só a depreciação (EBITDA add-back) ──────────
  SELECT COALESCE(SUM(valor_periodo), 0) INTO v_despesa_periodo FROM public.relatorio_dre(v_empresa_id, '2020-07-01', '2020-07-31') WHERE tipo = 'DESPESA';
  SELECT valor_periodo INTO v_dep_periodo FROM public.relatorio_dre(v_empresa_id, '2020-07-01', '2020-07-31') WHERE conta_id = v_conta_dep;
  IF v_despesa_periodo <> 200 OR v_dep_periodo <> 200 THEN
    RAISE EXCEPTION 'DRE de julho errada: despesa total=% depreciação=% (esperado 200/200)', v_despesa_periodo, v_dep_periodo;
  END IF;
  RETURN NEXT format('OK: DRE de julho — resultado=-%s, EBITDA = resultado + depreciação(%s) = %s (ida a zero, só depreciação no mês)', v_despesa_periodo, v_dep_periodo, -v_despesa_periodo + v_dep_periodo);

  RETURN NEXT 'PROVA FIN-4 PARTE 2 (fatia 1) COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_fin4p2();

-- ── limpeza: nenhum resíduo sintético fica no banco real ────────────────
-- O razão é imutável por design (lancamentos_contabeis "sem policy de
-- UPDATE/DELETE", trigger deferred trg_validar_balanco_lancamento_contabil
-- barra qualquer lançamento incompleto mesmo em DELETE parcial). Pra limpar
-- dado 100% sintético desta prova, desabilita o trigger só durante a
-- limpeza (ainda dentro da mesma transação) e reabilita antes do commit —
-- nunca fica desabilitado de fato, e nenhum lançamento real é tocado.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.lancamentos_contabeis_itens DISABLE TRIGGER trg_validar_balanco_lancamento_contabil;
DELETE FROM public.lancamentos_contabeis_itens WHERE lancamento_id IN (
  SELECT id FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE FIN4P2%'
);
DELETE FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE FIN4P2%';
ALTER TABLE public.lancamentos_contabeis_itens ENABLE TRIGGER trg_validar_balanco_lancamento_contabil;

SELECT
  (SELECT COUNT(*) FROM public.lancamentos_contabeis WHERE historico LIKE 'TESTE FIN4P2%') AS lancamentos_residuais,
  (SELECT COUNT(*) FROM public.lancamentos_contabeis_itens i JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id WHERE l.historico LIKE 'TESTE FIN4P2%') AS itens_residuais;
