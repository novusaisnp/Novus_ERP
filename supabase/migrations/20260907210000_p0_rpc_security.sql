-- P0: fecha RPCs SECURITY DEFINER expostas e preserva somente os consumidores reais.

CREATE OR REPLACE FUNCTION public.recalc_saldo_estoque(
  p_empresa uuid,
  p_produto uuid,
  p_localizacao uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd numeric(15,4);
  v_custo numeric(15,4);
  v_total_produto numeric(15,4);
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.produtos
    WHERE id = p_produto AND empresa_representada_id = p_empresa
  ) OR NOT EXISTS (
    SELECT 1 FROM public.localizacoes_estoque
    WHERE id = p_localizacao AND empresa_representada_id = p_empresa
  ) THEN
    RAISE EXCEPTION 'ESTOQUE_TENANT_INVALIDO' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO') AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo IN ('SAIDA','AJUSTE_NEGATIVO') AND localizacao_origem_id = p_localizacao THEN -quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_origem_id = p_localizacao THEN -quantidade
      ELSE 0
    END
  ), 0)
  INTO v_qtd
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND (localizacao_origem_id = p_localizacao OR localizacao_destino_id = p_localizacao);

  SELECT COALESCE(AVG(NULLIF(custo_unitario, 0)), 0)
  INTO v_custo
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND tipo IN ('ENTRADA','AJUSTE_POSITIVO')
    AND localizacao_destino_id = p_localizacao;

  INSERT INTO public.estoque_saldos (
    empresa_representada_id, produto_id, localizacao_id, quantidade, custo_medio, updated_at
  ) VALUES (
    p_empresa, p_produto, p_localizacao, v_qtd, v_custo, now()
  )
  ON CONFLICT (empresa_representada_id, produto_id, localizacao_id)
  DO UPDATE SET
    quantidade = EXCLUDED.quantidade,
    custo_medio = EXCLUDED.custo_medio,
    updated_at = now();

  SELECT COALESCE(SUM(quantidade), 0)
  INTO v_total_produto
  FROM public.estoque_saldos
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto;

  UPDATE public.produtos
  SET estoque_atual = v_total_produto
  WHERE id = p_produto
    AND empresa_representada_id = p_empresa;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_saldo_estoque(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

-- Consumida pelo frontend: deixa de ignorar as RLS da tabela fiscal.
ALTER FUNCTION public.get_ultimo_documento_por_venda(uuid[]) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.get_ultimo_documento_por_venda(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ultimo_documento_por_venda(uuid[]) TO authenticated, service_role;

-- Preserva o contrato RPC e deixa a RLS de itens/regras impor o tenant.
ALTER FUNCTION public.resolver_classificacao_receita(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.resolver_classificacao_receita(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_classificacao_receita(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.recalc_saldo_estoque(uuid,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.recalc_saldo_estoque(uuid,uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.resolver_classificacao_receita(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'P0_RPC_ACL_INVALIDA';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE oid IN (
      'public.get_ultimo_documento_por_venda(uuid[])'::regprocedure,
      'public.resolver_classificacao_receita(uuid)'::regprocedure
    )
      AND prosecdef
  ) THEN
    RAISE EXCEPTION 'P0_RPC_FISCAL_AINDA_SECURITY_DEFINER';
  END IF;
END;
$$;
