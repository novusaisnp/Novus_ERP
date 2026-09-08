-- Prova de FIN-1 (renegociação de título): dado sintético em transação com
-- ROLLBACK, RPCs reais (financeiro_liquidar_titulo/financeiro_renegociar_titulo),
-- nunca INSERT direto simulando efeito de trigger.

BEGIN;

CREATE FUNCTION pg_temp.prova_renegociacao() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_admin uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000098';
  v_pessoa_id uuid;
  v_titulo_id uuid;
  v_titulo_parcial_id uuid;
  v_titulo_pago_id uuid;
  v_resultado jsonb;
  v_ticket uuid;
  v_lancamentos_titulo_original int;
  v_lancamentos_novas_parcelas int;
  v_soma_lancamentos_titulo numeric;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_user_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_admin)::text, true);

  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_admin;
  SELECT id INTO v_pessoa_id FROM public.entidades WHERE empresa_representada_id = v_empresa_id LIMIT 1;
  IF v_pessoa_id IS NULL THEN
    INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
    VALUES (v_empresa_id, 'PF', 'TESTE FIN1 — renegociação') RETURNING id INTO v_pessoa_id;
  END IF;

  -- ===== Caso 1: título 100% aberto renegociado em 2 parcelas =====
  INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
  VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo renegociado', 300, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-RENEG-1')
  RETURNING id INTO v_titulo_id;

  SELECT count(*), COALESCE(sum(i.valor) FILTER (WHERE i.tipo_partida = 'DEBITO'), 0)
    INTO v_lancamentos_titulo_original, v_soma_lancamentos_titulo
    FROM public.lancamentos_contabeis l
    JOIN public.lancamentos_contabeis_itens i ON i.lancamento_id = l.id
   WHERE l.origem_tabela = 'contas_receber' AND l.origem_id = v_titulo_id;
  IF v_lancamentos_titulo_original = 0 THEN
    RETURN NEXT 'AVISO: contas default nao configuradas para esta empresa — lancamento do titulo original nao foi criado, prova da guarda contra dupla contagem fica sem base de comparacao';
  ELSE
    RETURN NEXT 'OK: titulo original gerou lancamento contabil normalmente (soma debito = ' || v_soma_lancamentos_titulo || ')';
  END IF;

  -- Sem permissao/ticket: recusado.
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_estranho)::text, true);
    PERFORM public.financeiro_renegociar_titulo(
      v_titulo_id, 'CONTAS_RECEBER', 'tentativa sem permissao', gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 300, 'data_vencimento', (CURRENT_DATE + 30)::text))
    );
    RETURN NEXT 'FALHA: usuario sem permissao deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou renegociacao sem permissao/ticket (' || SQLERRM || ')';
  END;

  -- Admin com ticket: sucesso, 2 parcelas somando o saldo.
  PERFORM set_config('request.jwt.claim.sub', v_user_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_admin)::text, true);
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova fin1 renegociacao', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket;

  v_resultado := public.financeiro_renegociar_titulo(
    v_titulo_id, 'CONTAS_RECEBER', 'cliente pediu prazo maior', gen_random_uuid(),
    jsonb_build_array(
      jsonb_build_object('numero', 1, 'valor', 150, 'data_vencimento', (CURRENT_DATE + 30)::text),
      jsonb_build_object('numero', 2, 'valor', 150, 'data_vencimento', (CURRENT_DATE + 60)::text)
    ),
    v_ticket
  );
  IF (v_resultado->>'status') = 'RENEGOCIADO' AND jsonb_array_length(v_resultado->'novos_titulos_ids') = 2 THEN
    RETURN NEXT 'OK: renegociacao aceita, 2 novas parcelas criadas';
  ELSE
    RETURN NEXT 'FALHA: resultado inesperado — ' || v_resultado::text;
  END IF;

  IF EXISTS (SELECT 1 FROM public.contas_receber WHERE id = v_titulo_id AND status = 'RENEGOCIADO') THEN
    RETURN NEXT 'OK: titulo original marcado como RENEGOCIADO';
  ELSE
    RETURN NEXT 'FALHA: titulo original nao ficou RENEGOCIADO';
  END IF;

  IF (SELECT count(*) FROM public.contas_receber WHERE renegociado_de_id = v_titulo_id) = 2 THEN
    RETURN NEXT 'OK: 2 novos titulos rastreados via renegociado_de_id';
  ELSE
    RETURN NEXT 'FALHA: rastreabilidade renegociado_de_id incorreta';
  END IF;

  IF (SELECT COALESCE(sum(valor_original), 0) FROM public.contas_receber WHERE renegociado_de_id = v_titulo_id) = 300 THEN
    RETURN NEXT 'OK: soma das novas parcelas bate com o saldo renegociado (300)';
  ELSE
    RETURN NEXT 'FALHA: soma das novas parcelas nao bate com o saldo';
  END IF;

  -- Guarda contábil: as parcelas novas NÃO devem ter gerado lançamento de reconhecimento
  -- (evita duplicar receita já reconhecida pelo título original).
  SELECT count(*) INTO v_lancamentos_novas_parcelas
    FROM public.lancamentos_contabeis l
   WHERE l.origem_tabela = 'contas_receber'
     AND l.origem_id IN (SELECT id FROM public.contas_receber WHERE renegociado_de_id = v_titulo_id);
  IF v_lancamentos_novas_parcelas = 0 THEN
    RETURN NEXT 'OK: novas parcelas nao geraram lancamento contabil (sem dupla contagem)';
  ELSE
    RETURN NEXT 'FALHA: novas parcelas geraram lancamento contabil — duplicou receita!';
  END IF;

  -- Idempotência: reenviar a mesma idempotency_key não duplica.
  -- (idempotency_key já foi consumida internamente pela chamada acima via gen_random_uuid();
  --  reexecuta com a MESMA chave explicitamente para provar o caminho idempotente.)
  -- Nota: o ticket é consumido antes da checagem de idempotência (mesma ordem já
  -- usada em financeiro_cancelar_titulo/financeiro_estornar_liquidacao) — um retry
  -- real precisa de um ticket novo se o original já foi consumido; a idempotência
  -- protege é contra duplicar o EFEITO da operação, não contra reconsumir o ticket.
  DECLARE
    v_chave_fixa uuid := gen_random_uuid();
    v_titulo_idem_id uuid;
    v_resultado2 jsonb;
    v_resultado3 jsonb;
    v_ticket2 uuid;
    v_ticket3 uuid;
  BEGIN
    INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
    VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo idempotencia', 80, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-RENEG-IDEM')
    RETURNING id INTO v_titulo_idem_id;

    INSERT INTO public.autorizacoes_financeiras (
      empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
    ) VALUES (
      v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova idempotencia', now() + interval '1 hour'
    ) RETURNING ticket INTO v_ticket2;

    v_resultado2 := public.financeiro_renegociar_titulo(
      v_titulo_idem_id, 'CONTAS_RECEBER', 'motivo idempotencia', v_chave_fixa,
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 80, 'data_vencimento', (CURRENT_DATE + 30)::text)),
      v_ticket2
    );
    INSERT INTO public.autorizacoes_financeiras (
      empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
    ) VALUES (
      v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova idempotencia retry', now() + interval '1 hour'
    ) RETURNING ticket INTO v_ticket3;

    v_resultado3 := public.financeiro_renegociar_titulo(
      v_titulo_idem_id, 'CONTAS_RECEBER', 'motivo idempotencia', v_chave_fixa,
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 80, 'data_vencimento', (CURRENT_DATE + 30)::text)),
      v_ticket3
    );
    IF (v_resultado2->>'idempotente') = 'false' AND (v_resultado3->>'idempotente') = 'true' THEN
      RETURN NEXT 'OK: segunda chamada com a mesma chave retornou idempotente=true, sem duplicar';
    ELSE
      RETURN NEXT 'FALHA: idempotencia nao funcionou — ' || v_resultado2::text || ' / ' || v_resultado3::text;
    END IF;
    IF (SELECT count(*) FROM public.contas_receber WHERE renegociado_de_id = v_titulo_idem_id) = 1 THEN
      RETURN NEXT 'OK: reenvio idempotente nao criou parcela duplicada';
    ELSE
      RETURN NEXT 'FALHA: reenvio idempotente duplicou parcela';
    END IF;
  END;

  -- ===== Caso 2: soma das parcelas divergente do saldo é recusada =====
  INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
  VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo soma errada', 100, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-RENEG-SOMA')
  RETURNING id INTO v_titulo_parcial_id;
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova soma errada', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket;
  BEGIN
    PERFORM public.financeiro_renegociar_titulo(
      v_titulo_parcial_id, 'CONTAS_RECEBER', 'soma nao bate', gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 999, 'data_vencimento', (CURRENT_DATE + 30)::text)),
      v_ticket
    );
    RETURN NEXT 'FALHA: soma divergente deveria ter sido recusada';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou soma de parcelas divergente do saldo (' || SQLERRM || ')';
  END;

  -- ===== Caso 3: título já totalmente pago não pode ser renegociado =====
  INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
  VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo ja pago', 50, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-RENEG-PAGO')
  RETURNING id INTO v_titulo_pago_id;
  PERFORM public.financeiro_liquidar_titulo(
    v_titulo_pago_id, 'CONTAS_RECEBER', 50, CURRENT_DATE, 'DINHEIRO', gen_random_uuid(),
    NULL, NULL, '[]'::jsonb, NULL, 0, 0, 0
  );
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova titulo pago', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket;
  BEGIN
    PERFORM public.financeiro_renegociar_titulo(
      v_titulo_pago_id, 'CONTAS_RECEBER', 'tentativa em titulo pago', gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 50, 'data_vencimento', (CURRENT_DATE + 30)::text)),
      v_ticket
    );
    RETURN NEXT 'FALHA: titulo totalmente pago deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou renegociar titulo ja totalmente pago (' || SQLERRM || ')';
  END;

  -- ===== Caso 4: título já RENEGOCIADO não pode ser renegociado de novo =====
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'RENEGOCIACAO', v_user_admin, v_user_admin, 'prova dupla renegociacao', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket;
  BEGIN
    PERFORM public.financeiro_renegociar_titulo(
      v_titulo_id, 'CONTAS_RECEBER', 'segunda tentativa', gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('numero', 1, 'valor', 300, 'data_vencimento', (CURRENT_DATE + 30)::text)),
      v_ticket
    );
    RETURN NEXT 'FALHA: titulo ja renegociado deveria ter sido recusado de novo';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou renegociar titulo ja RENEGOCIADO (' || SQLERRM || ')';
  END;
END;
$$;

SELECT * FROM pg_temp.prova_renegociacao();

ROLLBACK;
