-- Prova do motor de ativo fixo (ATV-1) — dado sintético, BEGIN...ROLLBACK.
-- Aquisição -> lançamento; depreciação (2 competências, idempotente na 3ª chamada);
-- baixa com ganho; baixa com perda. Confere saldo em cada etapa.

-- processar_depreciacao_mensal/baixar_ativo_fixo checam auth.uid() — simula um usuário
-- novus_owner logado (via query direta como serviço, não há sessão real).
SELECT set_config('request.jwt.claim.sub', '26283f34-7204-4e39-a0ba-e65f2ca112ba', true);

DO $$
DECLARE
  v_empresa_id uuid;
  v_ativo1_id uuid;
  v_ativo2_id uuid;
  v_lanc_id uuid;
  v_debito numeric;
  v_credito numeric;
  v_dep_count int;
  v_resultado jsonb;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas_representadas LIMIT 1;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa_representada encontrada para a prova';
  END IF;

  IF (SELECT plano_conta_imobilizado_default_id FROM public.empresas_representadas WHERE id = v_empresa_id) IS NULL THEN
    RAISE EXCEPTION 'Seed de ativo fixo não rodou pra empresa %', v_empresa_id;
  END IF;
  RAISE NOTICE 'OK: contas de ativo fixo existem pra empresa %', v_empresa_id;

  -- Ativo 1: 12000, sem residual, 12 meses -> depreciação mensal de 1000.
  INSERT INTO public.ativos_fixos (empresa_representada_id, nome, data_aquisicao, valor_aquisicao, valor_residual, vida_util_meses)
  VALUES (v_empresa_id, 'PROVA ATV-1 — Notebook', '2026-01-15', 12000, 0, 12)
  RETURNING id INTO v_ativo1_id;

  SELECT id INTO v_lanc_id FROM public.lancamentos_contabeis WHERE origem_tabela = 'ativos_fixos' AND origem_id = v_ativo1_id AND origem_tipo = 'MANUAL' AND historico LIKE 'Aquisição%';
  IF v_lanc_id IS NULL THEN RAISE EXCEPTION 'Lançamento de aquisição não foi gerado'; END IF;

  SELECT COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'),0), COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'),0)
    INTO v_debito, v_credito FROM public.lancamentos_contabeis_itens WHERE lancamento_id = v_lanc_id;
  IF v_debito <> 12000 OR v_credito <> 12000 THEN
    RAISE EXCEPTION 'Lançamento de aquisição desbalanceado: % / %', v_debito, v_credito;
  END IF;
  RAISE NOTICE 'OK: aquisição gerou lançamento balanceado (12000/12000)';

  -- Depreciação mês 1
  PERFORM * FROM public.processar_depreciacao_mensal(v_empresa_id, '2026-01-01');
  SELECT valor_depreciado_acumulado INTO v_debito FROM public.ativos_fixos WHERE id = v_ativo1_id;
  IF v_debito <> 1000 THEN RAISE EXCEPTION 'Depreciação mês 1 errada: %', v_debito; END IF;
  RAISE NOTICE 'OK: depreciação mês 1 = 1000';

  -- Repetir a mesma competência não deve gerar de novo (idempotência por ultima_competencia_depreciada)
  PERFORM * FROM public.processar_depreciacao_mensal(v_empresa_id, '2026-01-01');
  SELECT count(*) INTO v_dep_count FROM public.lancamentos_contabeis WHERE origem_tabela='ativos_fixos' AND origem_id = v_ativo1_id AND historico LIKE 'Depreciação%';
  IF v_dep_count <> 1 THEN RAISE EXCEPTION 'Depreciação duplicou: % lançamentos', v_dep_count; END IF;
  RAISE NOTICE 'OK: reprocessar a mesma competência não duplica';

  -- Depreciação mês 2
  PERFORM * FROM public.processar_depreciacao_mensal(v_empresa_id, '2026-02-01');
  SELECT valor_depreciado_acumulado INTO v_debito FROM public.ativos_fixos WHERE id = v_ativo1_id;
  IF v_debito <> 2000 THEN RAISE EXCEPTION 'Depreciação acumulada mês 2 errada: %', v_debito; END IF;
  RAISE NOTICE 'OK: depreciação acumulada após mês 2 = 2000';

  -- Baixa com GANHO: valor contábil = 12000 - 2000 = 10000; vendido por 11000 -> ganho 1000 (crédito)
  v_resultado := public.baixar_ativo_fixo(v_ativo1_id, '2026-03-01', 11000, 'Prova de baixa com ganho');
  IF (v_resultado->>'resultado')::numeric <> 1000 THEN
    RAISE EXCEPTION 'Resultado da baixa com ganho errado: %', v_resultado->>'resultado';
  END IF;
  SELECT COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'),0), COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'),0)
    INTO v_debito, v_credito FROM public.lancamentos_contabeis_itens WHERE lancamento_id = (v_resultado->>'lancamento_id')::uuid;
  IF v_debito <> v_credito THEN RAISE EXCEPTION 'Lançamento de baixa (ganho) desbalanceado: % / %', v_debito, v_credito; END IF;
  RAISE NOTICE 'OK: baixa com ganho balanceada (débito=crédito=%), resultado +1000', v_debito;

  -- Ativo 2: 6000, sem residual, 6 meses -> dep mensal 1000. Deprecia 1 mês, baixa com PERDA.
  INSERT INTO public.ativos_fixos (empresa_representada_id, nome, data_aquisicao, valor_aquisicao, valor_residual, vida_util_meses)
  VALUES (v_empresa_id, 'PROVA ATV-1 — Impressora', '2026-01-10', 6000, 0, 6)
  RETURNING id INTO v_ativo2_id;
  PERFORM * FROM public.processar_depreciacao_mensal(v_empresa_id, '2026-01-01');

  -- valor contábil = 6000 - 1000 = 5000; vendido por 2000 -> perda de 3000 (débito)
  v_resultado := public.baixar_ativo_fixo(v_ativo2_id, '2026-02-15', 2000, 'Prova de baixa com perda');
  IF (v_resultado->>'resultado')::numeric <> -3000 THEN
    RAISE EXCEPTION 'Resultado da baixa com perda errado: %', v_resultado->>'resultado';
  END IF;
  SELECT COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'),0), COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'),0)
    INTO v_debito, v_credito FROM public.lancamentos_contabeis_itens WHERE lancamento_id = (v_resultado->>'lancamento_id')::uuid;
  IF v_debito <> v_credito THEN RAISE EXCEPTION 'Lançamento de baixa (perda) desbalanceado: % / %', v_debito, v_credito; END IF;
  RAISE NOTICE 'OK: baixa com perda balanceada (débito=crédito=%), resultado -3000', v_debito;

  RAISE NOTICE 'PROVA ATV-1 COMPLETA — todas as asserções passaram';
END $$;
