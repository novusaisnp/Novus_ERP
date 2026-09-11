-- Bloco B da varredura de RPCs SECURITY DEFINER (compras). Mesmo padrão e
-- mesmo fix dos blocos anteriores (20260910150000, 20260910160000):
-- has_role(auth.uid(),'admin') é GLOBAL, trocado por 'novus_owner'.
-- 5 funções confirmadas vulneráveis por leitura completa do corpo:
--   cancelar_pedido_compra, confirmar_recebimento_compra,
--   enviar_pedido_compra_para_aprovacao, gerar_pedidos_compra_da_cotacao,
--   marcar_pedido_compra_emitido

CREATE OR REPLACE FUNCTION public.cancelar_pedido_compra(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status NOT IN ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'REJEITADO') THEN
    RAISE EXCEPTION 'PEDIDO_NAO_CANCELAVEL' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pedidos_compra SET status = 'CANCELADO' WHERE id = p_pedido_id;
  RETURN jsonb_build_object('ok', true, 'status', 'CANCELADO');
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_compra(p_pedido_id uuid, p_itens jsonb, p_observacoes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido record;
  v_item jsonb;
  v_pedido_item record;
  v_ja_recebido numeric;
  v_qtd_recebendo numeric;
  v_localizacao_id uuid;
  v_mov_id uuid;
  v_recebimento_id uuid;
  v_pedido_completo boolean := true;
  v_pi record;
  v_fornecedor_nome text;
  v_valor_total numeric(14, 2);
  v_titulo_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status <> 'EMITIDO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_EMITIDO' USING ERRCODE = 'P0001';
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'RECEBIMENTO_SEM_ITENS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.recebimentos_compra (empresa_representada_id, pedido_id, criado_por, observacoes)
  VALUES (v_pedido.empresa_representada_id, p_pedido_id, auth.uid(), NULLIF(trim(COALESCE(p_observacoes, '')), ''))
  RETURNING id INTO v_recebimento_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    SELECT * INTO v_pedido_item FROM public.pedidos_compra_itens
      WHERE id = (v_item->>'pedido_item_id')::uuid AND pedido_id = p_pedido_id;
    IF v_pedido_item IS NULL THEN
      RAISE EXCEPTION 'ITEM_NAO_PERTENCE_AO_PEDIDO' USING ERRCODE = 'P0001';
    END IF;

    v_qtd_recebendo := (v_item->>'quantidade_recebida')::numeric;
    IF v_qtd_recebendo IS NULL OR v_qtd_recebendo <= 0 THEN
      RAISE EXCEPTION 'QUANTIDADE_INVALIDA' USING ERRCODE = 'P0001';
    END IF;

    v_localizacao_id := (v_item->>'localizacao_destino_id')::uuid;
    IF v_localizacao_id IS NULL THEN
      RAISE EXCEPTION 'LOCALIZACAO_OBRIGATORIA' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.localizacoes_estoque
      WHERE id = v_localizacao_id AND empresa_representada_id = v_pedido.empresa_representada_id
    ) THEN
      RAISE EXCEPTION 'LOCALIZACAO_INVALIDA' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(quantidade_recebida), 0) INTO v_ja_recebido
      FROM public.recebimentos_compra_itens WHERE pedido_item_id = v_pedido_item.id;

    IF v_ja_recebido + v_qtd_recebendo > v_pedido_item.quantidade THEN
      RAISE EXCEPTION 'QUANTIDADE_EXCEDE_PEDIDO: item % já recebeu % de % pedido(s)',
        v_pedido_item.id, v_ja_recebido, v_pedido_item.quantidade USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, custo_unitario,
      localizacao_destino_id, data_movimento, documento_ref, observacoes, created_by
    ) VALUES (
      v_pedido.empresa_representada_id, v_pedido_item.produto_id, 'ENTRADA', v_qtd_recebendo, v_pedido_item.preco_unitario,
      v_localizacao_id, now(), CONCAT('PEDIDO-', substring(p_pedido_id::text, 1, 8)),
      CONCAT('Recebimento de pedido de compra — ', v_item->>'observacao'), auth.uid()
    ) RETURNING id INTO v_mov_id;

    INSERT INTO public.recebimentos_compra_itens (
      recebimento_id, empresa_representada_id, pedido_item_id, produto_id,
      quantidade_recebida, observacao, estoque_movimentacao_id
    ) VALUES (
      v_recebimento_id, v_pedido.empresa_representada_id, v_pedido_item.id, v_pedido_item.produto_id,
      v_qtd_recebendo, NULLIF(trim(COALESCE(v_item->>'observacao', '')), ''), v_mov_id
    );
  END LOOP;

  -- Match de 3 vias: só gera título quando TODOS os itens do pedido estiverem
  -- 100% recebidos (soma de todos os recebimentos, não só este).
  FOR v_pi IN SELECT * FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id
  LOOP
    SELECT COALESCE(SUM(quantidade_recebida), 0) INTO v_ja_recebido
      FROM public.recebimentos_compra_itens WHERE pedido_item_id = v_pi.id;
    IF v_ja_recebido < v_pi.quantidade THEN
      v_pedido_completo := false;
      EXIT;
    END IF;
  END LOOP;

  IF v_pedido_completo THEN
    SELECT COALESCE(razao_social, nome_fantasia, nome, 'fornecedor') INTO v_fornecedor_nome
      FROM public.entidades WHERE id = v_pedido.fornecedor_id;

    SELECT SUM(quantidade * preco_unitario) INTO v_valor_total
      FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id;

    INSERT INTO public.contas_pagar (
      empresa_representada_id, fornecedor_id, descricao, valor_original,
      data_emissao, data_vencimento, data_competencia, status
    ) VALUES (
      v_pedido.empresa_representada_id, v_pedido.fornecedor_id,
      format('Pedido de compra — %s', v_fornecedor_nome), v_valor_total,
      CURRENT_DATE, CURRENT_DATE + 30, CURRENT_DATE, 'PENDENTE'
    ) RETURNING id INTO v_titulo_id;

    UPDATE public.pedidos_compra SET status = 'RECEBIDO', contas_pagar_id = v_titulo_id WHERE id = p_pedido_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'recebimento_id', v_recebimento_id,
    'pedido_completo', v_pedido_completo, 'contas_pagar_id', v_titulo_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.enviar_pedido_compra_para_aprovacao(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido record;
  v_valor_total numeric(14, 2);
  v_qtd_itens int;
  v_fornecedor_nome text;
  v_resultado jsonb;
  v_status_final text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_E_RASCUNHO' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*), COALESCE(SUM(quantidade * preco_unitario), 0)
    INTO v_qtd_itens, v_valor_total
  FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id;

  IF v_qtd_itens = 0 THEN
    RAISE EXCEPTION 'PEDIDO_SEM_ITENS' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(razao_social, nome_fantasia, nome, 'fornecedor') INTO v_fornecedor_nome
    FROM public.entidades WHERE id = v_pedido.fornecedor_id;

  v_resultado := public.solicitar_aprovacao(
    v_pedido.empresa_representada_id,
    'COMPRA',
    v_valor_total,
    format('Pedido de compra — %s (%s itens)', v_fornecedor_nome, v_qtd_itens),
    jsonb_build_object('pedido_id', p_pedido_id, 'fornecedor_id', v_pedido.fornecedor_id),
    'pedidos_compra',
    p_pedido_id
  );

  v_status_final := CASE WHEN v_resultado->>'status' = 'AUTO_APROVADO' THEN 'APROVADO' ELSE 'AGUARDANDO_APROVACAO' END;

  UPDATE public.pedidos_compra
  SET status = v_status_final,
      solicitacao_aprovacao_id = (v_resultado->>'solicitacao_id')::uuid
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true, 'status', v_status_final, 'valor_total', v_valor_total);
END;
$function$;

CREATE OR REPLACE FUNCTION public.gerar_pedidos_compra_da_cotacao(p_cotacao_id uuid)
 RETURNS SETOF pedidos_compra
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cotacao record;
  v_fornecedor record;
  v_pedido_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cotacao FROM public.cotacoes_compra WHERE id = p_cotacao_id;
  IF v_cotacao IS NULL THEN
    RAISE EXCEPTION 'COTACAO_NAO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(v_cotacao.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_cotacao.status <> 'FECHADA' THEN
    RAISE EXCEPTION 'COTACAO_NAO_FECHADA' USING ERRCODE = 'P0001';
  END IF;

  FOR v_fornecedor IN
    SELECT DISTINCT fornecedor_id FROM public.cotacoes_compra_precos
    WHERE cotacao_id = p_cotacao_id AND vencedor
  LOOP
    SELECT id INTO v_pedido_id FROM public.pedidos_compra
      WHERE cotacao_id = p_cotacao_id AND fornecedor_id = v_fornecedor.fornecedor_id;

    IF v_pedido_id IS NULL THEN
      INSERT INTO public.pedidos_compra (empresa_representada_id, cotacao_id, requisicao_id, fornecedor_id, criado_por)
      VALUES (v_cotacao.empresa_representada_id, p_cotacao_id, v_cotacao.requisicao_id, v_fornecedor.fornecedor_id, auth.uid())
      RETURNING id INTO v_pedido_id;

      INSERT INTO public.pedidos_compra_itens (pedido_id, empresa_representada_id, requisicao_item_id, produto_id, quantidade, preco_unitario)
      SELECT v_pedido_id, v_cotacao.empresa_representada_id, ri.id, ri.produto_id, ri.quantidade, cp.preco_unitario
      FROM public.cotacoes_compra_precos cp
      JOIN public.requisicoes_compra_itens ri ON ri.id = cp.requisicao_item_id
      WHERE cp.cotacao_id = p_cotacao_id AND cp.fornecedor_id = v_fornecedor.fornecedor_id AND cp.vencedor;
    END IF;

    RETURN QUERY SELECT * FROM public.pedidos_compra WHERE id = v_pedido_id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.marcar_pedido_compra_emitido(p_pedido_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status <> 'APROVADO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_APROVADO' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pedidos_compra SET status = 'EMITIDO', emitido_em = now() WHERE id = p_pedido_id;
  RETURN jsonb_build_object('ok', true, 'status', 'EMITIDO');
END;
$function$;
