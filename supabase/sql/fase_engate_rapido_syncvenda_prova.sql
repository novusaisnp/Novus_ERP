-- Prova de que os nomes/tipos de coluna usados na reescrita de syncVenda
-- (supabase/functions/sync-webhook/index.ts) batem com o schema real —
-- simula o INSERT em vendas + itens_venda que o código Deno monta, já que
-- não há runtime Deno disponível nesta sessão para exercitar a function
-- de verdade. Roda inteiro dentro de BEGIN...ROLLBACK, nada persiste.

DO $$
DECLARE
  v_empresa uuid;
  v_venda_id uuid;
  v_count integer;
BEGIN
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[ENGATE-TEST] Empresa', '77777777000191') RETURNING id INTO v_empresa;

  -- Mesmo shape de vendaData em syncVenda (mode insert/sync).
  INSERT INTO vendas (
    empresa_representada_id, numero_venda, cliente_id, data_venda, status, tipo,
    subtotal, desconto, acrescimo, valor_frete, valor_total, observacoes, vendedor_id,
    origem_canal, origem_sistema, externo_id, idempotency_key, hash_payload
  ) VALUES (
    v_empresa, 'PDV-000001', NULL, current_date, 'CONFIRMADO', 'P',
    87.50, 0, 0, 0, 87.50, NULL, NULL,
    'webhook', 'pdv-loja-01', 'CF-000482', 'pdv-loja-01:venda:PDV-000001', 'hash-fake-teste'
  ) RETURNING id INTO v_venda_id;

  -- Mesmo shape de buildItensVendaRows.
  INSERT INTO itens_venda (
    venda_id, empresa_representada_id, tipo_item, produto_id, servico_id,
    descricao, quantidade, unidade, preco_unitario, desconto_item, acrescimo_item,
    valor_total_item, ordem, observacoes
  ) VALUES
    (v_venda_id, v_empresa, 'P', NULL, NULL, 'REF-001', 2, NULL, 35.00, 0, 0, 70.00, 0, NULL),
    (v_venda_id, v_empresa, 'P', NULL, NULL, 'REF-002', 1, NULL, 17.50, 0, 0, 17.50, 1, NULL);

  SELECT count(*) INTO v_count FROM itens_venda WHERE venda_id = v_venda_id;
  ASSERT v_count = 2, 'esperava 2 itens gravados, achou ' || v_count;

  -- Prova de idempotência: o SELECT que syncVenda faz antes do insert (por
  -- empresa + idempotency_key, deleted_at IS NULL) precisa achar essa linha.
  SELECT count(*) INTO v_count FROM vendas
   WHERE empresa_representada_id = v_empresa
     AND idempotency_key = 'pdv-loja-01:venda:PDV-000001'
     AND deleted_at IS NULL;
  ASSERT v_count = 1, 'lookup de idempotencia deveria achar 1 linha, achou ' || v_count;

  RAISE NOTICE 'ok: schema de vendas/itens_venda bate com o payload que syncVenda monta';
END $$;
