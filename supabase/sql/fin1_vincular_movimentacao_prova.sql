-- Prova de FIN-1 (vincular movimentação bancária existente na liquidação):
-- dado sintético em transação com ROLLBACK, RPC real (não simula efeito de
-- trigger/lógica). Reusa o admin real MAXWELL já usado nas provas de PERM-1
-- (tem permissao financeiro.liquidar).

BEGIN;

CREATE FUNCTION pg_temp.prova_vincular_mov() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_admin uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_pessoa_id uuid;
  v_conta_bancaria_id uuid;
  v_titulo_id uuid;
  v_titulo2_id uuid;
  v_mov_id uuid;
  v_mov_ja_vinculada_id uuid;
  v_mov_valor_errado_id uuid;
  v_mov_sentido_errado_id uuid;
  v_resultado jsonb;
  v_ticket_estorno uuid;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_user_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_admin)::text, true);

  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_admin;
  SELECT id INTO v_conta_bancaria_id FROM public.contas_bancarias WHERE empresa_representada_id = v_empresa_id AND ativo = true LIMIT 1;
  IF v_conta_bancaria_id IS NULL THEN
    INSERT INTO public.contas_bancarias (empresa_representada_id, numero_conta, nome_titular, conta_cofre)
    VALUES (v_empresa_id, 'TESTE-FIN1-000', 'TESTE FIN1 — conta', true) RETURNING id INTO v_conta_bancaria_id;
  END IF;
  SELECT id INTO v_pessoa_id FROM public.entidades WHERE empresa_representada_id = v_empresa_id LIMIT 1;
  IF v_pessoa_id IS NULL THEN
    INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
    VALUES (v_empresa_id, 'PF', 'TESTE FIN1 — cliente') RETURNING id INTO v_pessoa_id;
  END IF;

  INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
  VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo vinculo', 300, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-FIN1-VINC-1')
  RETURNING id INTO v_titulo_id;

  INSERT INTO public.contas_receber (empresa_representada_id, cliente_id, descricao, valor_original, data_vencimento, data_emissao, status, numero_documento)
  VALUES (v_empresa_id, v_pessoa_id, 'TESTE FIN1 — titulo vinculo 2', 300, CURRENT_DATE, CURRENT_DATE, 'PENDENTE', 'PROVA-FIN1-VINC-2')
  RETURNING id INTO v_titulo2_id;

  -- Movimentação candidata: DEPOSITO, sem título, valor exato 300.
  INSERT INTO public.movimentacoes_bancarias (empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor, data_lancamento, data_movimentacao, descricao, status, usuario_criacao_id)
  VALUES (v_empresa_id, v_conta_bancaria_id, 'DEPOSITO', 'DEPOSITO', 300, CURRENT_DATE, CURRENT_DATE, 'TESTE FIN1 — deposito pre-existente', 'EFETIVADO', v_user_admin)
  RETURNING id INTO v_mov_id;

  -- ===== Caso 1: vincula a existente com sucesso =====
  BEGIN
    SELECT public.financeiro_liquidar_titulo(
      v_titulo_id, 'CONTAS_RECEBER', 300, CURRENT_DATE, 'TRANSFERENCIA', gen_random_uuid(),
      NULL, 'vinculo de teste', '[]'::jsonb, NULL, 0, 0, 0, v_mov_id
    ) INTO v_resultado;
    IF (v_resultado->>'movimentacao_id')::uuid = v_mov_id THEN
      RETURN NEXT 'OK: liquidacao vinculou a movimentacao existente (mesmo id retornado)';
    ELSE
      RETURN NEXT 'FALHA: liquidacao nao retornou o id da movimentacao vinculada';
    END IF;
    IF EXISTS (SELECT 1 FROM public.movimentacoes_bancarias WHERE id = v_mov_id AND liquidacao_titulo_id IS NOT NULL) THEN
      RETURN NEXT 'OK: movimentacao existente ficou marcada com liquidacao_titulo_id';
    ELSE
      RETURN NEXT 'FALHA: movimentacao existente nao ficou vinculada';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.movimentacoes_bancarias
       WHERE liquidacao_titulo_id = (v_resultado->>'liquidacao_id')::uuid AND id <> v_mov_id
    ) THEN
      RETURN NEXT 'OK: nenhuma movimentacao nova foi criada (nao duplicou)';
    ELSE
      RETURN NEXT 'FALHA: uma segunda movimentacao foi criada, deveria ter reaproveitado a existente';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'FALHA: caso 1 deveria ter passado (' || SQLERRM || ')';
  END;

  -- ===== Caso 2: reusar a mesma movimentacao (agora ja vinculada) para outro titulo falha =====
  BEGIN
    PERFORM public.financeiro_liquidar_titulo(
      v_titulo2_id, 'CONTAS_RECEBER', 300, CURRENT_DATE, 'TRANSFERENCIA', gen_random_uuid(),
      NULL, NULL, '[]'::jsonb, NULL, 0, 0, 0, v_mov_id
    );
    RETURN NEXT 'FALHA: reusar movimentacao ja vinculada deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou reusar movimentacao ja vinculada a outro titulo (' || SQLERRM || ')';
  END;

  -- ===== Caso 3: valor nao bate =====
  INSERT INTO public.movimentacoes_bancarias (empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor, data_lancamento, data_movimentacao, descricao, status, usuario_criacao_id)
  VALUES (v_empresa_id, v_conta_bancaria_id, 'DEPOSITO', 'DEPOSITO', 999.99, CURRENT_DATE, CURRENT_DATE, 'TESTE FIN1 — valor errado', 'EFETIVADO', v_user_admin)
  RETURNING id INTO v_mov_valor_errado_id;
  BEGIN
    PERFORM public.financeiro_liquidar_titulo(
      v_titulo2_id, 'CONTAS_RECEBER', 300, CURRENT_DATE, 'TRANSFERENCIA', gen_random_uuid(),
      NULL, NULL, '[]'::jsonb, NULL, 0, 0, 0, v_mov_valor_errado_id
    );
    RETURN NEXT 'FALHA: valor divergente deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou vinculo com valor divergente (' || SQLERRM || ')';
  END;

  -- ===== Caso 4: sentido errado (SAQUE para um CONTAS_RECEBER, que espera DEPOSITO) =====
  INSERT INTO public.movimentacoes_bancarias (empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor, data_lancamento, data_movimentacao, descricao, status, usuario_criacao_id)
  VALUES (v_empresa_id, v_conta_bancaria_id, 'SAQUE', 'SAQUE', 300, CURRENT_DATE, CURRENT_DATE, 'TESTE FIN1 — sentido errado', 'EFETIVADO', v_user_admin)
  RETURNING id INTO v_mov_sentido_errado_id;
  BEGIN
    PERFORM public.financeiro_liquidar_titulo(
      v_titulo2_id, 'CONTAS_RECEBER', 300, CURRENT_DATE, 'TRANSFERENCIA', gen_random_uuid(),
      NULL, NULL, '[]'::jsonb, NULL, 0, 0, 0, v_mov_sentido_errado_id
    );
    RETURN NEXT 'FALHA: sentido errado (SAQUE) deveria ter sido recusado para conta a receber';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou vinculo com sentido errado (' || SQLERRM || ')';
  END;

  -- ===== Caso 5: combinar vinculo com conta_bancaria_id (nova) ao mesmo tempo falha =====
  BEGIN
    PERFORM public.financeiro_liquidar_titulo(
      v_titulo2_id, 'CONTAS_RECEBER', 300, CURRENT_DATE, 'TRANSFERENCIA', gen_random_uuid(),
      v_conta_bancaria_id, NULL, '[]'::jsonb, NULL, 0, 0, 0, v_mov_id
    );
    RETURN NEXT 'FALHA: combinar p_conta_bancaria_id com p_movimentacao_bancaria_id deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: recusou combinar vinculo existente com conta bancaria nova (' || SQLERRM || ')';
  END;

  -- ===== Caso 6: estorno da liquidacao vinculada segue funcionando normalmente (sem mudanca no estorno) =====
  -- Estorno sempre exige ticket (emissao real e via edge function); inserido direto na trilha,
  -- mesma convencao de supabase/sql/fin1_estorno_data_contabil_prova.sql.
  INSERT INTO public.autorizacoes_financeiras (
    empresa_representada_id, ticket, acao, solicitante_user_id, autorizador_user_id, justificativa, expira_em
  ) VALUES (
    v_empresa_id, gen_random_uuid(), 'ESTORNO', v_user_admin, v_user_admin, 'prova fin1 vinculo — estorno', now() + interval '1 hour'
  ) RETURNING ticket INTO v_ticket_estorno;
  BEGIN
    PERFORM public.financeiro_estornar_liquidacao(
      (v_resultado->>'liquidacao_id')::uuid, 'estorno de teste da prova FIN1', gen_random_uuid(), v_ticket_estorno
    );
    IF EXISTS (SELECT 1 FROM public.movimentacoes_bancarias WHERE id = v_mov_id AND estornado = true) THEN
      RETURN NEXT 'OK: estorno marcou a movimentacao vinculada como estornada, sem mudanca no estorno em si';
    ELSE
      RETURN NEXT 'FALHA: estorno nao marcou a movimentacao vinculada como estornada';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'FALHA: estorno da liquidacao vinculada deveria ter passado (' || SQLERRM || ')';
  END;
END;
$$;

SELECT * FROM pg_temp.prova_vincular_mov();

ROLLBACK;
