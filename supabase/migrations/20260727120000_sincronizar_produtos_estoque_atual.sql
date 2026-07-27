
-- ============================================================
-- Achado durante a ativação de baixar_estoque_venda/estornar_estoque_venda
-- (2026-07-27): produtos.estoque_atual é um campo legado, setado só
-- manualmente no cadastro do produto, e NUNCA era atualizado pelo
-- livro-razão real de movimentação (estoque_movimentacoes ->
-- recalc_saldo_estoque -> estoque_saldos). Isso significa que o número
-- mostrado no seletor de catálogo (CatalogoItemPicker, usado em
-- Orçamentos e Vendas) e usado na validação de "estoque insuficiente"
-- nunca refletia baixa/entrada real — dois números de estoque paralelos
-- e desencontrados. recalc_saldo_estoque é o único ponto de escrita em
-- estoque_saldos (confirmado: toda movimentação, inclusive ajuste de
-- inventário via conciliar_inventario, passa só por
-- estoque_movimentacoes -> trigger -> aqui), então basta estender esta
-- função para também sincronizar produtos.estoque_atual.
-- ============================================================
CREATE OR REPLACE FUNCTION public.recalc_saldo_estoque(p_empresa uuid, p_produto uuid, p_localizacao uuid)
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
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO') AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo IN ('SAIDA','AJUSTE_NEGATIVO') AND localizacao_origem_id = p_localizacao THEN -quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_origem_id = p_localizacao THEN -quantidade
      ELSE 0
    END
  ),0)
  INTO v_qtd
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND (localizacao_origem_id = p_localizacao OR localizacao_destino_id = p_localizacao);

  SELECT COALESCE(AVG(NULLIF(custo_unitario,0)),0) INTO v_custo
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND tipo IN ('ENTRADA','AJUSTE_POSITIVO')
    AND localizacao_destino_id = p_localizacao;

  INSERT INTO public.estoque_saldos (empresa_representada_id, produto_id, localizacao_id, quantidade, custo_medio, updated_at)
  VALUES (p_empresa, p_produto, p_localizacao, v_qtd, v_custo, now())
  ON CONFLICT (empresa_representada_id, produto_id, localizacao_id)
  DO UPDATE SET quantidade = EXCLUDED.quantidade, custo_medio = EXCLUDED.custo_medio, updated_at = now();

  -- Sincroniza o campo legado produtos.estoque_atual com a soma real de
  -- estoque_saldos em todas as localizações do produto.
  SELECT COALESCE(SUM(quantidade), 0) INTO v_total_produto
  FROM public.estoque_saldos
  WHERE produto_id = p_produto;

  UPDATE public.produtos SET estoque_atual = v_total_produto WHERE id = p_produto;
END;
$$;

-- Backfill: sincroniza de uma vez os produtos que já têm saldo real
-- (movimentação já registrada) mas cujo estoque_atual nunca foi ajustado.
-- Produtos sem nenhuma linha em estoque_saldos (nunca movimentados) não
-- são tocados — mantêm o valor manual de cadastro, não há livro-razão
-- para substituí-lo.
UPDATE public.produtos p
SET estoque_atual = s.total
FROM (
  SELECT produto_id, COALESCE(SUM(quantidade), 0) AS total
  FROM public.estoque_saldos
  GROUP BY produto_id
) s
WHERE s.produto_id = p.id;
