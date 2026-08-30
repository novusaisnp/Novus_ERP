-- Prova do motor de partidas dobradas (FIN-4 parte 1) — dado sintético, BEGIN...ROLLBACK.
-- Simula: título a receber criado -> lançamento de reconhecimento; liquidado ->
-- lançamento de caixa; estornado -> lançamento de reversão. Confere saldo em cada etapa.

DO $$
DECLARE
  v_empresa_id uuid;
  v_conta_bancaria_id uuid;
  v_conta_receber_id uuid;
  v_liquidacao_id uuid;
  v_lanc_criacao_id uuid;
  v_lanc_liquidacao_id uuid;
  v_lanc_estorno_id uuid;
  v_debito numeric;
  v_credito numeric;
  v_natureza_receita_id uuid;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas_representadas LIMIT 1;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa_representada encontrada para a prova';
  END IF;

  -- confirma que o seed do plano mínimo rodou
  IF (SELECT plano_conta_caixa_bancos_default_id FROM public.empresas_representadas WHERE id = v_empresa_id) IS NULL THEN
    RAISE EXCEPTION 'Seed do plano de contas mínimo não rodou pra empresa %', v_empresa_id;
  END IF;
  RAISE NOTICE 'OK: plano de contas mínimo existe pra empresa %', v_empresa_id;

  -- conta bancária sintética
  INSERT INTO public.contas_bancarias (empresa_representada_id, tipo_conta, numero_conta, ativo, conta_cofre)
  VALUES (v_empresa_id, 'CORRENTE', '99999-9', true, true)
  RETURNING id INTO v_conta_bancaria_id;

  SELECT id INTO v_natureza_receita_id FROM public.naturezas_receita WHERE empresa_representada_id = v_empresa_id LIMIT 1;

  -- título a receber sintético, com plano_conta_id já resolvido (mesmo padrão da
  -- classificação de receita real) e sem rateio, pra testar o caminho de fallback.
  INSERT INTO public.contas_receber (
    empresa_representada_id, descricao, valor_original, data_vencimento, data_emissao,
    status, plano_conta_id, natureza_id
  ) VALUES (
    v_empresa_id, 'PROVA FIN-4 — título sintético', 1000.00, CURRENT_DATE + 30, CURRENT_DATE,
    'PENDENTE',
    (SELECT id FROM public.plano_contas WHERE empresa_representada_id = v_empresa_id AND codigo = '1.2'),
    v_natureza_receita_id
  ) RETURNING id INTO v_conta_receber_id;

  SELECT id INTO v_lanc_criacao_id FROM public.lancamentos_contabeis
  WHERE origem_tabela = 'contas_receber' AND origem_id = v_conta_receber_id;

  IF v_lanc_criacao_id IS NULL THEN
    RAISE EXCEPTION 'Lançamento de reconhecimento não foi gerado ao criar o título';
  END IF;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'), 0)
  INTO v_debito, v_credito
  FROM public.lancamentos_contabeis_itens WHERE lancamento_id = v_lanc_criacao_id;

  IF v_debito <> 1000.00 OR v_credito <> 1000.00 THEN
    RAISE EXCEPTION 'Lançamento de reconhecimento desbalanceado: débito % crédito %', v_debito, v_credito;
  END IF;
  RAISE NOTICE 'OK: título criado gerou lançamento balanceado (1000/1000)';

  -- liquidação total, com juros de 50 — efetivo esperado = 1050
  INSERT INTO public.liquidacoes_titulos (
    empresa_representada_id, conta_receber_id, titulo_id, tipo_titulo,
    data_liquidacao, data_pagamento, valor_pago, valor_original_titulo, forma_pagamento,
    conta_bancaria_id, valor_juros, valor_multa, valor_desconto, idempotency_key
  ) VALUES (
    v_empresa_id, v_conta_receber_id, v_conta_receber_id, 'CONTAS_RECEBER',
    CURRENT_DATE, CURRENT_DATE, 1000.00, 1000.00, 'PIX',
    v_conta_bancaria_id, 50.00, 0, 0, gen_random_uuid()
  ) RETURNING id INTO v_liquidacao_id;

  SELECT id INTO v_lanc_liquidacao_id FROM public.lancamentos_contabeis
  WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = v_liquidacao_id;

  IF v_lanc_liquidacao_id IS NULL THEN
    RAISE EXCEPTION 'Lançamento de liquidação não foi gerado';
  END IF;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'), 0)
  INTO v_debito, v_credito
  FROM public.lancamentos_contabeis_itens WHERE lancamento_id = v_lanc_liquidacao_id;

  IF v_debito <> 1050.00 OR v_credito <> 1050.00 THEN
    RAISE EXCEPTION 'Lançamento de liquidação com valor efetivo errado: débito % crédito % (esperado 1050)', v_debito, v_credito;
  END IF;
  RAISE NOTICE 'OK: liquidação gerou lançamento com valor efetivo correto (1050 = 1000 + 50 juros)';

  -- estorno da liquidação
  UPDATE public.liquidacoes_titulos SET estornado = true, data_estorno = now(), motivo_estorno = 'prova'
  WHERE id = v_liquidacao_id;

  SELECT id INTO v_lanc_estorno_id FROM public.lancamentos_contabeis
  WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = v_liquidacao_id AND origem_tipo = 'ESTORNO';

  IF v_lanc_estorno_id IS NULL THEN
    RAISE EXCEPTION 'Lançamento de estorno não foi gerado';
  END IF;

  IF (SELECT estorno_de_id FROM public.lancamentos_contabeis WHERE id = v_lanc_estorno_id) <> v_lanc_liquidacao_id THEN
    RAISE EXCEPTION 'estorno_de_id não aponta pro lançamento original';
  END IF;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='DEBITO'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo_partida='CREDITO'), 0)
  INTO v_debito, v_credito
  FROM public.lancamentos_contabeis_itens WHERE lancamento_id = v_lanc_estorno_id;

  IF v_debito <> 1050.00 OR v_credito <> 1050.00 THEN
    RAISE EXCEPTION 'Lançamento de estorno desbalanceado: débito % crédito %', v_debito, v_credito;
  END IF;
  RAISE NOTICE 'OK: estorno gerou lançamento de reversão balanceado (1050/1050)';

  -- tenta violar o balanceamento diretamente (deve falhar)
  BEGIN
    INSERT INTO public.lancamentos_contabeis (empresa_representada_id, data_competencia, historico, origem_tipo)
    VALUES (v_empresa_id, CURRENT_DATE, 'PROVA desbalanceado', 'MANUAL')
    RETURNING id INTO v_lanc_criacao_id;
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor)
    VALUES (v_lanc_criacao_id, (SELECT plano_conta_caixa_bancos_default_id FROM public.empresas_representadas WHERE id = v_empresa_id), 'DEBITO', 999);
    -- o trigger de balanço é deferred (roda só no fim da transação) — força a checagem
    -- agora em vez de esperar o commit, senão o ROLLBACK final mascararia a falha.
    SET CONSTRAINTS trg_validar_balanco_lancamento_contabil IMMEDIATE;
    RAISE EXCEPTION 'FALHA_DA_PROVA: deveria ter bloqueado lançamento desbalanceado';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'LANCAMENTO_INCOMPLETO%' OR SQLERRM LIKE 'LANCAMENTO_DESBALANCEADO%' THEN
        RAISE NOTICE 'OK: lançamento desbalanceado foi rejeitado como esperado (%)', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  RAISE NOTICE 'PROVA FIN-4 COMPLETA — todas as asserções passaram';
END $$;
