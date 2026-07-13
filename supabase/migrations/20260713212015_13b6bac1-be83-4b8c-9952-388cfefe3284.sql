DO $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas_representadas WHERE nome = 'E2E TEST CO' LIMIT 1;
  IF v_empresa_id IS NULL THEN
    RAISE NOTICE 'Tenant "E2E TEST CO" não encontrado; seed F4 ignorado.';
    RETURN;
  END IF;

  -- Localização idempotente
  IF NOT EXISTS (
    SELECT 1 FROM public.localizacoes_estoque
    WHERE empresa_representada_id = v_empresa_id AND nome = 'E2E - Depósito Principal'
  ) THEN
    INSERT INTO public.localizacoes_estoque (empresa_representada_id, nome, descricao, ativo)
    VALUES (v_empresa_id, 'E2E - Depósito Principal', 'Seed F4 - localização default para testes E2E', true);
  END IF;

  -- Produto idempotente
  IF NOT EXISTS (
    SELECT 1 FROM public.produtos
    WHERE empresa_representada_id = v_empresa_id AND codigo = 'E2E-F4-001' AND deleted_at IS NULL
  ) THEN
    INSERT INTO public.produtos (
      empresa_representada_id, codigo, nome, descricao,
      preco_custo, preco_venda, estoque_atual, estoque_minimo,
      controla_estoque, ativo
    ) VALUES (
      v_empresa_id, 'E2E-F4-001', 'E2E Produto Seed F4', 'Seed F4 - produto default para testes E2E',
      50, 100, 0, 0, true, true
    );
  END IF;
END $$;