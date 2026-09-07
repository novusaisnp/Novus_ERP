-- Prova do COMP-1d (confirmar_recebimento_compra) — cadeia sintética completa
-- requisição -> cotação -> pedido (inserida direto, bypassando RLS via role
-- postgres, porque RLS de requisição/cotação já foi provada em COMP-1a/1b;
-- aqui o alvo é só a RPC de recebimento + match de 3 vias).
--
-- Cobre: recebimento parcial (sem gerar título), bloqueio de quantidade
-- excedente, recebimento do restante fechando o pedido (match de 3 vias gera
-- contas_pagar com valor correto e o FIN-4 lança sozinho via trigger),
-- bloqueio de novo recebimento em pedido já RECEBIDO, item que não pertence
-- ao pedido, quantidade inválida, itens vazios, pedido inexistente, acesso
-- negado, e saldo de estoque batendo no fim.
--
-- ATENÇÃO: sem BEGIN/ROLLBACK (mesmo padrão do ORC-1/COMP-1a/1b/1c) — os
-- INSERTs sintéticos e os efeitos da RPC persistem até a limpeza no final
-- deste mesmo arquivo. Rodar o arquivo inteiro de uma vez.

CREATE FUNCTION pg_temp.prova_comp1d() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000099'; -- sem vínculo com a empresa
  v_produto_id uuid;
  v_localizacao_id uuid;
  v_fornecedor_id uuid;
  v_requisicao_id uuid;
  v_requisicao_item_id uuid;
  v_cotacao_id uuid;
  v_pedido_id uuid;
  v_pedido_item_id uuid;
  v_res jsonb;
  v_status text;
  v_contas_pagar_id uuid;
  v_valor numeric;
  v_saldo numeric;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa do usuário de teste não encontrada';
  END IF;
  RETURN NEXT format('OK: empresa de teste = %s', v_empresa_id);

  -- ── monta a cadeia sintética direto (RLS dessas tabelas já provada antes) ──
  INSERT INTO public.produtos (empresa_representada_id, nome)
    VALUES (v_empresa_id, 'TESTE COMP1D — Produto') RETURNING id INTO v_produto_id;

  INSERT INTO public.localizacoes_estoque (empresa_representada_id, nome)
    VALUES (v_empresa_id, 'TESTE COMP1D — Localização') RETURNING id INTO v_localizacao_id;

  INSERT INTO public.entidades (empresa_representada_id, tipo_pessoa, nome)
    VALUES (v_empresa_id, 'PJ', 'TESTE COMP1D — Fornecedor') RETURNING id INTO v_fornecedor_id;

  INSERT INTO public.requisicoes_compra (empresa_representada_id, solicitante_id, justificativa, status)
    VALUES (v_empresa_id, v_user_a, 'TESTE COMP1D', 'ABERTA') RETURNING id INTO v_requisicao_id;

  INSERT INTO public.requisicoes_compra_itens (requisicao_id, empresa_representada_id, produto_id, quantidade)
    VALUES (v_requisicao_id, v_empresa_id, v_produto_id, 100) RETURNING id INTO v_requisicao_item_id;

  INSERT INTO public.cotacoes_compra (empresa_representada_id, requisicao_id, criado_por, status)
    VALUES (v_empresa_id, v_requisicao_id, v_user_a, 'ABERTA') RETURNING id INTO v_cotacao_id;

  INSERT INTO public.pedidos_compra (empresa_representada_id, cotacao_id, requisicao_id, fornecedor_id, criado_por, status, emitido_em)
    VALUES (v_empresa_id, v_cotacao_id, v_requisicao_id, v_fornecedor_id, v_user_a, 'EMITIDO', now()) RETURNING id INTO v_pedido_id;

  INSERT INTO public.pedidos_compra_itens (pedido_id, empresa_representada_id, requisicao_item_id, produto_id, quantidade, preco_unitario)
    VALUES (v_pedido_id, v_empresa_id, v_requisicao_item_id, v_produto_id, 100, 10.50) RETURNING id INTO v_pedido_item_id;

  RETURN NEXT 'OK: cadeia sintética montada (requisição -> cotação -> pedido EMITIDO, 100un x R$10,50)';

  -- ── 1) pedido inexistente ──────────────────────────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  BEGIN
    PERFORM public.confirmar_recebimento_compra('00000000-0000-4000-8000-000000000001', '[{"pedido_item_id":"00000000-0000-4000-8000-000000000001","quantidade_recebida":1}]'::jsonb, NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: pedido inexistente deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PEDIDO_NAO_ENCONTRADO%' THEN
        RETURN NEXT 'OK: pedido inexistente bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 2) acesso negado (usuário sem vínculo com a empresa) ──────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 1)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: usuário sem acesso deveria ser bloqueado';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT 'OK: usuário sem acesso à empresa foi bloqueado';
      ELSE RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  -- ── 3) itens vazios ─────────────────────────────────────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, '[]'::jsonb, NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: itens vazios deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'RECEBIMENTO_SEM_ITENS%' THEN
        RETURN NEXT 'OK: recebimento sem itens bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 4) quantidade inválida ─────────────────────────────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 0)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: quantidade zero deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'QUANTIDADE_INVALIDA%' THEN
        RETURN NEXT 'OK: quantidade inválida (0) bloqueada';
      ELSE RAISE; END IF;
  END;

  -- ── 5) item que não pertence ao pedido ─────────────────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', gen_random_uuid(), 'quantidade_recebida', 1, 'localizacao_destino_id', v_localizacao_id)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: item alheio deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'ITEM_NAO_PERTENCE_AO_PEDIDO%' THEN
        RETURN NEXT 'OK: item que não pertence ao pedido bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 5b) localização não informada ───────────────────────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 1)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: localização ausente deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'LOCALIZACAO_OBRIGATORIA%' THEN
        RETURN NEXT 'OK: recebimento sem localização de destino bloqueado';
      ELSE RAISE; END IF;
  END;

  -- ── 5c) localização de outra empresa/inexistente ───────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 1, 'localizacao_destino_id', gen_random_uuid())), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: localização inválida deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'LOCALIZACAO_INVALIDA%' THEN
        RETURN NEXT 'OK: localização de destino inválida bloqueada';
      ELSE RAISE; END IF;
  END;

  -- ── 6) recebimento parcial (60 de 100) — não fecha o pedido ────────────
  v_res := public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 60, 'localizacao_destino_id', v_localizacao_id)), 'Primeira remessa');
  IF (v_res->>'pedido_completo')::boolean <> false THEN
    RAISE EXCEPTION 'Recebimento parcial não deveria fechar o pedido: %', v_res;
  END IF;
  IF v_res->>'contas_pagar_id' IS NOT NULL THEN
    RAISE EXCEPTION 'Recebimento parcial não deveria gerar título: %', v_res;
  END IF;
  SELECT status INTO v_status FROM public.pedidos_compra WHERE id = v_pedido_id;
  IF v_status <> 'EMITIDO' THEN
    RAISE EXCEPTION 'Pedido deveria continuar EMITIDO após recebimento parcial, veio %', v_status;
  END IF;
  RETURN NEXT 'OK: recebimento parcial (60/100) não fecha o pedido nem gera título';

  -- ── 7) exceder o saldo do pedido (60 + 50 > 100) ───────────────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 50, 'localizacao_destino_id', v_localizacao_id)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: quantidade excedente deveria falhar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'QUANTIDADE_EXCEDE_PEDIDO%' THEN
        RETURN NEXT format('OK: quantidade excedente bloqueada (%s)', SQLERRM);
      ELSE RAISE; END IF;
  END;

  -- ── 8) recebimento do restante (40) — fecha o pedido, match de 3 vias ─
  v_res := public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 40, 'localizacao_destino_id', v_localizacao_id)), 'Remessa final');
  IF (v_res->>'pedido_completo')::boolean <> true THEN
    RAISE EXCEPTION 'Recebimento final deveria fechar o pedido: %', v_res;
  END IF;
  v_contas_pagar_id := (v_res->>'contas_pagar_id')::uuid;
  IF v_contas_pagar_id IS NULL THEN
    RAISE EXCEPTION 'Match de 3 vias deveria ter gerado o título: %', v_res;
  END IF;

  SELECT status INTO v_status FROM public.pedidos_compra WHERE id = v_pedido_id;
  IF v_status <> 'RECEBIDO' THEN
    RAISE EXCEPTION 'Pedido deveria estar RECEBIDO, veio %', v_status;
  END IF;

  SELECT valor_original, status INTO v_valor, v_status FROM public.contas_pagar WHERE id = v_contas_pagar_id;
  IF v_valor <> 1050.00 THEN
    RAISE EXCEPTION 'Valor do título deveria ser 1050.00 (100 x 10.50), veio %', v_valor;
  END IF;
  IF v_status <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Título deveria nascer PENDENTE, veio %', v_status;
  END IF;
  RETURN NEXT format('OK: match de 3 vias fechou o pedido, gerou contas_pagar #%s no valor de R$%s', v_contas_pagar_id, v_valor);

  -- ── 9) FIN-4: o lançamento contábil nasceu sozinho (trigger do título) ──
  IF NOT EXISTS (SELECT 1 FROM public.lancamentos_contabeis WHERE origem_tabela = 'contas_pagar' AND origem_id = v_contas_pagar_id) THEN
    RAISE EXCEPTION 'FIN-4 deveria ter lançado o título sozinho via trigger, não achei lancamentos_contabeis para %', v_contas_pagar_id;
  END IF;
  RETURN NEXT 'OK: FIN-4 lançou o título sozinho (trg_contas_pagar_lancar_criado), sem código novo pra isso';

  -- ── 10) novo recebimento em pedido já RECEBIDO -> bloqueado ────────────
  BEGIN
    PERFORM public.confirmar_recebimento_compra(v_pedido_id, jsonb_build_array(jsonb_build_object('pedido_item_id', v_pedido_item_id, 'quantidade_recebida', 1, 'localizacao_destino_id', v_localizacao_id)), NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: pedido já RECEBIDO não deveria aceitar novo recebimento';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PEDIDO_NAO_EMITIDO%' THEN
        RETURN NEXT 'OK: pedido já RECEBIDO bloqueia novo recebimento';
      ELSE RAISE; END IF;
  END;

  -- ── 11) Kardex bate: 2 movimentações (60 + 40) ligadas aos itens ───────
  IF (SELECT COUNT(*) FROM public.recebimentos_compra_itens rci
        JOIN public.recebimentos_compra rc ON rc.id = rci.recebimento_id
        WHERE rc.pedido_id = v_pedido_id) <> 2 THEN
    RAISE EXCEPTION 'Esperava 2 linhas de recebimentos_compra_itens (60 + 40)';
  END IF;
  IF (SELECT COUNT(*) FROM public.estoque_movimentacoes em
        JOIN public.recebimentos_compra_itens rci ON rci.estoque_movimentacao_id = em.id
        JOIN public.recebimentos_compra rc ON rc.id = rci.recebimento_id
        WHERE rc.pedido_id = v_pedido_id AND em.tipo = 'ENTRADA') <> 2 THEN
    RAISE EXCEPTION 'Esperava 2 movimentações de estoque ENTRADA ligadas ao recebimento';
  END IF;
  SELECT COALESCE(SUM(quantidade), 0) INTO v_saldo FROM public.estoque_saldos WHERE produto_id = v_produto_id AND empresa_representada_id = v_empresa_id;
  IF v_saldo <> 100 THEN
    RAISE EXCEPTION 'Saldo em estoque_saldos deveria ser 100, veio %', v_saldo;
  END IF;
  RETURN NEXT 'OK: Kardex bate — 2 movimentações ENTRADA rastreadas, saldo final = 100';

  RETURN NEXT 'PROVA COMP-1D COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_comp1d();

-- ── limpeza: nenhum resíduo sintético fica no banco real ────────────────
-- (pedidos_compra.contas_pagar_id referencia contas_pagar — precisa zerar/
-- apagar o pedido antes de apagar o título, senão a FK bloqueia o DELETE)
DELETE FROM public.recebimentos_compra_itens WHERE recebimento_id IN (
  SELECT id FROM public.recebimentos_compra WHERE pedido_id IN (
    SELECT pc.id FROM public.pedidos_compra pc JOIN public.entidades e ON e.id = pc.fornecedor_id WHERE e.nome = 'TESTE COMP1D — Fornecedor'
  )
);
DELETE FROM public.recebimentos_compra WHERE pedido_id IN (
  SELECT pc.id FROM public.pedidos_compra pc JOIN public.entidades e ON e.id = pc.fornecedor_id WHERE e.nome = 'TESTE COMP1D — Fornecedor'
);
DELETE FROM public.pedidos_compra_itens WHERE pedido_id IN (
  SELECT pc.id FROM public.pedidos_compra pc JOIN public.entidades e ON e.id = pc.fornecedor_id WHERE e.nome = 'TESTE COMP1D — Fornecedor'
);
DELETE FROM public.pedidos_compra WHERE fornecedor_id IN (SELECT id FROM public.entidades WHERE nome = 'TESTE COMP1D — Fornecedor');
DELETE FROM public.contas_pagar WHERE descricao LIKE 'Pedido de compra — TESTE COMP1D%';
DELETE FROM public.cotacoes_compra WHERE criado_por = 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1' AND requisicao_id IN (
  SELECT id FROM public.requisicoes_compra WHERE justificativa = 'TESTE COMP1D'
);
DELETE FROM public.requisicoes_compra_itens WHERE requisicao_id IN (SELECT id FROM public.requisicoes_compra WHERE justificativa = 'TESTE COMP1D');
DELETE FROM public.requisicoes_compra WHERE justificativa = 'TESTE COMP1D';
DELETE FROM public.estoque_movimentacoes WHERE documento_ref LIKE 'PEDIDO-%' AND produto_id IN (SELECT id FROM public.produtos WHERE nome = 'TESTE COMP1D — Produto');
DELETE FROM public.estoque_saldos WHERE produto_id IN (SELECT id FROM public.produtos WHERE nome = 'TESTE COMP1D — Produto');
DELETE FROM public.entidades WHERE nome = 'TESTE COMP1D — Fornecedor';
DELETE FROM public.produtos WHERE nome = 'TESTE COMP1D — Produto';
DELETE FROM public.localizacoes_estoque WHERE nome = 'TESTE COMP1D — Localização';

-- ── confirma zero resíduo ────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM public.produtos WHERE nome = 'TESTE COMP1D — Produto') AS produtos_residuais,
  (SELECT COUNT(*) FROM public.entidades WHERE nome = 'TESTE COMP1D — Fornecedor') AS entidades_residuais,
  (SELECT COUNT(*) FROM public.requisicoes_compra WHERE justificativa = 'TESTE COMP1D') AS requisicoes_residuais,
  (SELECT COUNT(*) FROM public.contas_pagar WHERE descricao LIKE 'Pedido de compra — TESTE COMP1D%') AS titulos_residuais;
