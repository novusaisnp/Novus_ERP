-- Prova de FIN-1: data contábil manual no estorno. Dado sintético em 2020
-- (mesma convenção das provas de FIN-4 parte 2, nunca colide com produção
-- real). Usa as RPCs reais (financeiro_liquidar_titulo /
-- financeiro_estornar_liquidacao), nunca INSERT direto simulando o efeito
-- dos triggers. Toda liquidação retroativa e todo estorno exigem ticket em
-- `autorizacoes_financeiras` — a emissão real é numa edge function, então
-- aqui inserimos o ticket direto na trilha (mesma tabela que
-- financeiro_consumir_autorizacao lê).

BEGIN;

CREATE FUNCTION pg_temp.prova_fin1_estorno() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_admin uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_titulo_id uuid;
  v_ticket_liq uuid;
  v_ticket_estorno uuid;
  v_liq jsonb;
  v_liquidacao_id uuid;
  v_data_liq date := '2020-07-10';
  v_data_contabil_estorno date := '2020-07-20';
  v_estorno jsonb;
  v_estorno_data_contabil date;
  v_lanc_estorno record;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_admin;

  PERFORM set_config('request.jwt.claim.sub', v_user_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_admin)::text, true);

  INSERT INTO public.contas_pagar (empresa_representada_id, descricao, valor_original, data_vencimento)
    VALUES (v_empresa_id, 'TESTE FIN-1 — estorno com data contabil', 1000, '2020-07-05')
    RETURNING id INTO v_titulo_id;

  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'LIQUIDACAO_RETROATIVA', v_user_admin, v_user_admin, 'prova fin-1', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket_liq;

  -- Liquida via RPC real (dispara lancar_liquidacao_titulo).
  v_liq := public.financeiro_liquidar_titulo(
    v_titulo_id, 'CONTAS_PAGAR', 1000, v_data_liq, 'DINHEIRO',
    gen_random_uuid(), NULL, 'prova fin-1', '[]'::jsonb, v_ticket_liq, 0, 0, 0
  );

  SELECT id INTO v_liquidacao_id FROM public.liquidacoes_titulos
   WHERE conta_pagar_id = v_titulo_id ORDER BY created_at DESC LIMIT 1;

  IF v_liquidacao_id IS NULL THEN
    RETURN NEXT 'FALHA: liquidacao nao foi criada';
    RETURN;
  END IF;
  RETURN NEXT 'OK: liquidacao criada via RPC real (' || v_liquidacao_id || ')';

  IF NOT EXISTS (
    SELECT 1 FROM public.lancamentos_contabeis
     WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = v_liquidacao_id
  ) THEN
    RETURN NEXT 'AVISO: contas default nao configuradas para esta empresa — lancamento original nao foi criado, prova do trigger de estorno fica sem base';
    RETURN;
  END IF;
  RETURN NEXT 'OK: lancamento contabil original criado pelo trigger real';

  -- Caso 1: data contabil no futuro deve ser recusada (ticket valido, mas a data e' que falha).
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'ESTORNO', v_user_admin, v_user_admin, 'prova fin-1 caso 1', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket_estorno;
  BEGIN
    PERFORM public.financeiro_estornar_liquidacao(
      v_liquidacao_id, 'teste data futura', gen_random_uuid(), v_ticket_estorno, CURRENT_DATE + 1
    );
    RETURN NEXT 'FALHA: estorno com data futura deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: estorno com data futura recusado (' || SQLERRM || ')';
  END;

  -- Caso 2: data contabil anterior a liquidacao deve ser recusada.
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'ESTORNO', v_user_admin, v_user_admin, 'prova fin-1 caso 2', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket_estorno;
  BEGIN
    PERFORM public.financeiro_estornar_liquidacao(
      v_liquidacao_id, 'teste data anterior', gen_random_uuid(), v_ticket_estorno, v_data_liq - 5
    );
    RETURN NEXT 'FALHA: estorno com data anterior a liquidacao deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: estorno com data anterior a liquidacao recusado (' || SQLERRM || ')';
  END;

  -- Caso 3: estorno valido com data contabil explicita (entre a liquidacao e hoje).
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'ESTORNO', v_user_admin, v_user_admin, 'prova fin-1 caso 3', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket_estorno;
  v_estorno := public.financeiro_estornar_liquidacao(
    v_liquidacao_id, 'estorno valido com data explicita', gen_random_uuid(), v_ticket_estorno, v_data_contabil_estorno
  );
  RETURN NEXT 'OK: estorno aceito, retorno=' || v_estorno::text;

  SELECT estorno_data_contabil INTO v_estorno_data_contabil
    FROM public.liquidacoes_titulos WHERE id = v_liquidacao_id;
  IF v_estorno_data_contabil = v_data_contabil_estorno THEN
    RETURN NEXT 'OK: liquidacoes_titulos.estorno_data_contabil = ' || v_estorno_data_contabil;
  ELSE
    RETURN NEXT 'FALHA: estorno_data_contabil = ' || COALESCE(v_estorno_data_contabil::text, 'NULL') || ', esperado ' || v_data_contabil_estorno;
  END IF;

  SELECT data_lancamento, data_competencia INTO v_lanc_estorno
    FROM public.lancamentos_contabeis
   WHERE origem_tabela = 'liquidacoes_titulos' AND origem_id = v_liquidacao_id AND origem_tipo = 'ESTORNO';

  IF v_lanc_estorno.data_lancamento = v_data_contabil_estorno AND v_lanc_estorno.data_competencia = v_data_contabil_estorno THEN
    RETURN NEXT 'OK: lancamento reverso usa a data contabil escolhida (' || v_lanc_estorno.data_lancamento || ')';
  ELSE
    RETURN NEXT 'FALHA: lancamento reverso com data errada — lancamento=' || COALESCE(v_lanc_estorno.data_lancamento::text,'NULL') || ' competencia=' || COALESCE(v_lanc_estorno.data_competencia::text,'NULL');
  END IF;
END;
$$;

SELECT * FROM pg_temp.prova_fin1_estorno();

ROLLBACK;
