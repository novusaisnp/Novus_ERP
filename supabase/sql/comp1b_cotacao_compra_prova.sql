-- Prova da Cotação de Compra (COMP-1b) — dado sintético, BEGIN...ROLLBACK.
-- RLS pura (sem RPC) — corpo roda sob SET LOCAL ROLE authenticated, mesmo
-- motivo documentado na prova do COMP-1a (db query roda como postgres,
-- rolbypassrls=true).
--
-- Cobre: criar cotação a partir de requisição ABERTA; convidar 2
-- fornecedores; registrar preço dos dois pro mesmo item; marcar vencedor
-- (só 1 por item — índice único parcial bloqueia um segundo vencedor pro
-- mesmo item); trocar de vencedor; fechar cotação; depois de fechada, nem
-- inserir preço novo nem convidar fornecedor novo é mais possível (RLS).

CREATE FUNCTION pg_temp.prova_comp1b() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_produto_id uuid;
  v_requisicao_id uuid;
  v_item_id uuid;
  v_fornecedor_a_id uuid;
  v_fornecedor_b_id uuid;
  v_fornecedor_c_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL
  v_cotacao_id uuid;
  v_preco_a_id uuid;
  v_preco_b_id uuid;
  v_afetadas int;
  v_vencedores int;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa de teste não encontrada';
  END IF;

  -- Fixtures sintéticos (banco de produção não tinha produto nem fornecedor
  -- cadastrado — mesmo achado do COMP-1a, registrado no STATUS.md).
  INSERT INTO public.produtos (empresa_representada_id, nome)
  VALUES (v_empresa_id, 'PROVA COMP-1b — produto sintético')
  RETURNING id INTO v_produto_id;

  INSERT INTO public.requisicoes_compra (empresa_representada_id, solicitante_id, justificativa)
  VALUES (v_empresa_id, v_user_a, 'Prova COMP-1b')
  RETURNING id INTO v_requisicao_id;

  INSERT INTO public.requisicoes_compra_itens (requisicao_id, empresa_representada_id, produto_id, quantidade)
  VALUES (v_requisicao_id, v_empresa_id, v_produto_id, 20)
  RETURNING id INTO v_item_id;

  INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
  VALUES (v_empresa_id, 'PJ', 'PROVA COMP-1b — Fornecedor A')
  RETURNING id INTO v_fornecedor_a_id;
  INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel)
  VALUES (v_fornecedor_a_id, v_empresa_id, 'FORNECEDOR');

  INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
  VALUES (v_empresa_id, 'PJ', 'PROVA COMP-1b — Fornecedor B')
  RETURNING id INTO v_fornecedor_b_id;
  INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel)
  VALUES (v_fornecedor_b_id, v_empresa_id, 'FORNECEDOR');

  INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
  VALUES (v_empresa_id, 'PJ', 'PROVA COMP-1b — Fornecedor C (não convidado)')
  RETURNING id INTO v_fornecedor_c_id;
  INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel)
  VALUES (v_fornecedor_c_id, v_empresa_id, 'FORNECEDOR');

  RETURN NEXT format('OK: fixtures criados (empresa=%s, requisição=%s, item=%s, 3 fornecedores)', v_empresa_id, v_requisicao_id, v_item_id);

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- 1) Criar cotação a partir da requisição.
  INSERT INTO public.cotacoes_compra (empresa_representada_id, requisicao_id, criado_por)
  VALUES (v_empresa_id, v_requisicao_id, v_user_a)
  RETURNING id INTO v_cotacao_id;
  RETURN NEXT 'OK: cotação criada (sob RLS), status ABERTA';

  -- 2) Convidar os 2 fornecedores.
  INSERT INTO public.cotacoes_compra_fornecedores (cotacao_id, empresa_representada_id, fornecedor_id)
  VALUES (v_cotacao_id, v_empresa_id, v_fornecedor_a_id), (v_cotacao_id, v_empresa_id, v_fornecedor_b_id);
  RETURN NEXT 'OK: 2 fornecedores convidados';

  -- 3) Registrar preço dos dois pro mesmo item — B mais barato.
  INSERT INTO public.cotacoes_compra_precos (cotacao_id, empresa_representada_id, requisicao_item_id, fornecedor_id, preco_unitario, prazo_entrega_dias)
  VALUES (v_cotacao_id, v_empresa_id, v_item_id, v_fornecedor_a_id, 12.50, 10)
  RETURNING id INTO v_preco_a_id;
  INSERT INTO public.cotacoes_compra_precos (cotacao_id, empresa_representada_id, requisicao_item_id, fornecedor_id, preco_unitario, prazo_entrega_dias)
  VALUES (v_cotacao_id, v_empresa_id, v_item_id, v_fornecedor_b_id, 9.90, 15)
  RETURNING id INTO v_preco_b_id;
  RETURN NEXT 'OK: preço registrado dos 2 fornecedores pro mesmo item';

  -- 4) Marcar B (mais barato) como vencedor.
  UPDATE public.cotacoes_compra_precos SET vencedor = true WHERE id = v_preco_b_id;
  RETURN NEXT 'OK: fornecedor B marcado vencedor do item';

  -- 5) Tentar marcar A vencedor TAMBÉM (sem desmarcar B primeiro) — deve
  -- violar o índice único parcial (só 1 vencedor por item por cotação).
  BEGIN
    UPDATE public.cotacoes_compra_precos SET vencedor = true WHERE id = v_preco_a_id;
    RAISE EXCEPTION 'FALHA_DA_PROVA: dois vencedores pro mesmo item deveriam ser bloqueados';
  EXCEPTION
    WHEN unique_violation THEN
      RETURN NEXT 'OK: segundo vencedor pro mesmo item bloqueado pelo índice único parcial';
  END;

  -- 6) Trocar de vencedor: desmarca B, marca A.
  UPDATE public.cotacoes_compra_precos SET vencedor = false WHERE id = v_preco_b_id;
  UPDATE public.cotacoes_compra_precos SET vencedor = true WHERE id = v_preco_a_id;
  SELECT count(*) INTO v_vencedores FROM public.cotacoes_compra_precos WHERE requisicao_item_id = v_item_id AND vencedor;
  IF v_vencedores <> 1 THEN
    RAISE EXCEPTION 'Troca de vencedor não resultou em exatamente 1 vencedor: %', v_vencedores;
  END IF;
  RETURN NEXT 'OK: troca de vencedor (B -> A) funcionou, sempre exatamente 1 vencedor';

  -- 7) Fechar a cotação.
  UPDATE public.cotacoes_compra SET status = 'FECHADA', fechada_em = now(), fechada_por = v_user_a WHERE id = v_cotacao_id;
  RETURN NEXT 'OK: cotação fechada';

  -- 8) Depois de fechada, não dá mais pra inserir preço novo (RLS: EXISTS
  -- exige status ABERTA).
  BEGIN
    INSERT INTO public.cotacoes_compra_precos (cotacao_id, empresa_representada_id, requisicao_item_id, fornecedor_id, preco_unitario)
    VALUES (v_cotacao_id, v_empresa_id, v_item_id, v_fornecedor_a_id, 999);
    RAISE EXCEPTION 'FALHA_DA_PROVA: inseriu preço numa cotação já fechada';
  EXCEPTION
    WHEN OTHERS THEN
      -- RLS bloqueia silenciosamente (0 linhas) só em UPDATE/DELETE; em INSERT
      -- a violação de WITH CHECK gera erro de fato (42501/RLS policy).
      IF SQLERRM ILIKE '%row-level security%' OR SQLSTATE = '42501' THEN
        RETURN NEXT format('OK: inserir preço em cotação fechada foi bloqueado pela RLS (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- 9) Depois de fechada, não dá mais pra convidar fornecedor novo (usa o
  -- fornecedor C, nunca convidado, pra não colidir com o UNIQUE e garantir
  -- que quem bloqueia aqui é mesmo a checagem de status na RLS).
  BEGIN
    INSERT INTO public.cotacoes_compra_fornecedores (cotacao_id, empresa_representada_id, fornecedor_id)
    VALUES (v_cotacao_id, v_empresa_id, v_fornecedor_c_id);
    RAISE EXCEPTION 'FALHA_DA_PROVA: convidou fornecedor numa cotação já fechada';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM ILIKE '%row-level security%' OR SQLSTATE = '42501' THEN
        RETURN NEXT format('OK: convidar fornecedor em cotação fechada foi bloqueado pela RLS (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  RETURN NEXT 'PROVA COMP-1b COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_comp1b();
