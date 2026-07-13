-- Seed de vendas para LIGNUM (empresa: f4ca208d-ad5e-4bf7-ab90-c66dd271f719)
-- Marcador: [SEED-P8] em vendas.observacoes para reversibilidade
DO $$
DECLARE
  v_emp uuid := 'f4ca208d-ad5e-4bf7-ab90-c66dd271f719';
  v_cliente_ids uuid[];
  v_produto_ids uuid[];
  v_produto_precos numeric[];
  v_n_clientes int;
  v_n_produtos int;
  i int;
  v_venda_id uuid;
  v_cliente uuid;
  v_data date;
  v_status text;
  v_r numeric;
  v_qtd_itens int;
  j int;
  v_prod_idx int;
  v_prod_id uuid;
  v_preco numeric;
  v_qtd numeric;
  v_total_item numeric;
  v_subtotal numeric;
BEGIN
  PERFORM setseed(0.42);

  SELECT array_agg(id) INTO v_cliente_ids
    FROM public.clientes
   WHERE empresa_representada_id = v_emp AND deleted_at IS NULL;
  v_n_clientes := array_length(v_cliente_ids, 1);

  SELECT array_agg(id), array_agg(COALESCE(NULLIF(preco_venda,0), 100))
    INTO v_produto_ids, v_produto_precos
    FROM public.produtos
   WHERE empresa_representada_id = v_emp AND deleted_at IS NULL;
  v_n_produtos := array_length(v_produto_ids, 1);

  IF v_n_clientes IS NULL OR v_n_produtos IS NULL THEN
    RAISE EXCEPTION 'Sem clientes ou produtos para seed';
  END IF;

  FOR i IN 1..300 LOOP
    v_cliente := v_cliente_ids[1 + floor(random() * v_n_clientes)::int];
    v_data := (CURRENT_DATE - (floor(random() * 540)::int))::date;

    v_r := random();
    v_status := CASE
      WHEN v_r < 0.55 THEN 'ENTREGUE'
      WHEN v_r < 0.75 THEN 'CONFIRMADO'
      WHEN v_r < 0.90 THEN 'FATURADO'
      WHEN v_r < 0.95 THEN 'RASCUNHO'
      ELSE 'CANCELADO'
    END;

    INSERT INTO public.vendas (
      empresa_representada_id, cliente_id, numero_venda, data_venda,
      status, origem, canal_venda, tipo, subtotal, valor_total, observacoes
    ) VALUES (
      v_emp, v_cliente,
      'V-SEED-' || lpad(i::text, 5, '0'),
      v_data, v_status, 'MANUAL', 'ERP', 'P', 0, 0,
      '[SEED-P8] Venda de povoamento'
    ) RETURNING id INTO v_venda_id;

    v_qtd_itens := 1 + floor(random() * 4)::int;
    v_subtotal := 0;

    FOR j IN 1..v_qtd_itens LOOP
      v_prod_idx := 1 + floor(random() * v_n_produtos)::int;
      v_prod_id := v_produto_ids[v_prod_idx];
      v_preco := v_produto_precos[v_prod_idx];
      v_qtd := (1 + floor(random() * 10))::numeric;
      v_total_item := round(v_qtd * v_preco, 2);
      v_subtotal := v_subtotal + v_total_item;

      INSERT INTO public.itens_venda (
        empresa_representada_id, venda_id, produto_id, descricao,
        quantidade, preco_unitario, valor_total_item, ordem, tipo_item
      ) VALUES (
        v_emp, v_venda_id, v_prod_id,
        '[SEED-P8] Item ' || j,
        v_qtd, v_preco, v_total_item, j, 'P'
      );
    END LOOP;

    UPDATE public.vendas
       SET subtotal = v_subtotal, valor_total = v_subtotal
     WHERE id = v_venda_id;
  END LOOP;
END $$;