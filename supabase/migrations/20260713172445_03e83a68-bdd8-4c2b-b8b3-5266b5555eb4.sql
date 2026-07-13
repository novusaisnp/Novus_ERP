
-- P14.1 Kardex — índice composto para consultas por empresa + produto + data
CREATE INDEX IF NOT EXISTS idx_estoque_mov_prod_data
  ON public.estoque_movimentacoes (empresa_representada_id, produto_id, data_movimento)
  WHERE deleted_at IS NULL;

-- Função Kardex: retorna movimentações com saldo acumulado (window function)
CREATE OR REPLACE FUNCTION public.fn_kardex_produto(
  p_empresa_id      uuid,
  p_produto_id      uuid,
  p_localizacao_id  uuid    DEFAULT NULL,
  p_data_inicio     date    DEFAULT NULL,
  p_data_fim        date    DEFAULT NULL,
  p_limit           integer DEFAULT 100,
  p_offset          integer DEFAULT 0
)
RETURNS TABLE (
  id                       uuid,
  data_movimento           timestamptz,
  tipo                     text,
  documento_ref            text,
  qtd_entrada              numeric,
  qtd_saida                numeric,
  saldo_acumulado          numeric,
  custo_unitario           numeric,
  custo_total              numeric,
  localizacao_origem_id    uuid,
  localizacao_destino_id   uuid,
  observacoes              text,
  total_count              bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_inicial numeric := 0;
BEGIN
  -- Tenant guard: bloqueia acesso cross-tenant
  IF NOT (public.user_has_access_to_empresa(p_empresa_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado à empresa %', p_empresa_id
      USING ERRCODE = '42501';
  END IF;

  -- Saldo inicial: soma de deltas anteriores a p_data_inicio (se informado)
  IF p_data_inicio IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN m.tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO')
             AND (p_localizacao_id IS NULL OR m.localizacao_destino_id = p_localizacao_id)
          THEN m.quantidade
        WHEN m.tipo IN ('SAIDA','AJUSTE_NEGATIVO')
             AND (p_localizacao_id IS NULL OR m.localizacao_origem_id = p_localizacao_id)
          THEN -m.quantidade
        WHEN m.tipo = 'TRANSFERENCIA' AND p_localizacao_id IS NOT NULL THEN
          CASE
            WHEN m.localizacao_destino_id = p_localizacao_id THEN  m.quantidade
            WHEN m.localizacao_origem_id  = p_localizacao_id THEN -m.quantidade
            ELSE 0
          END
        ELSE 0
      END
    ), 0)
    INTO v_saldo_inicial
    FROM public.estoque_movimentacoes m
    WHERE m.empresa_representada_id = p_empresa_id
      AND m.produto_id = p_produto_id
      AND m.deleted_at IS NULL
      AND m.data_movimento < p_data_inicio::timestamptz
      AND (
        p_localizacao_id IS NULL
        OR m.localizacao_origem_id  = p_localizacao_id
        OR m.localizacao_destino_id = p_localizacao_id
      );
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      m.id,
      m.data_movimento,
      m.tipo::text                              AS tipo,
      m.documento_ref::text                     AS documento_ref,
      m.quantidade,
      m.custo_unitario,
      m.localizacao_origem_id,
      m.localizacao_destino_id,
      m.observacoes,
      CASE
        WHEN m.tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO')
             AND (p_localizacao_id IS NULL OR m.localizacao_destino_id = p_localizacao_id)
          THEN m.quantidade
        WHEN m.tipo IN ('SAIDA','AJUSTE_NEGATIVO')
             AND (p_localizacao_id IS NULL OR m.localizacao_origem_id = p_localizacao_id)
          THEN -m.quantidade
        WHEN m.tipo = 'TRANSFERENCIA' AND p_localizacao_id IS NOT NULL THEN
          CASE
            WHEN m.localizacao_destino_id = p_localizacao_id THEN  m.quantidade
            WHEN m.localizacao_origem_id  = p_localizacao_id THEN -m.quantidade
            ELSE 0
          END
        WHEN m.tipo = 'TRANSFERENCIA' AND p_localizacao_id IS NULL THEN 0
        ELSE 0
      END AS delta
    FROM public.estoque_movimentacoes m
    WHERE m.empresa_representada_id = p_empresa_id
      AND m.produto_id = p_produto_id
      AND m.deleted_at IS NULL
      AND (p_data_inicio IS NULL OR m.data_movimento >= p_data_inicio::timestamptz)
      AND (p_data_fim    IS NULL OR m.data_movimento <  (p_data_fim::timestamptz + interval '1 day'))
      AND (
        p_localizacao_id IS NULL
        OR m.localizacao_origem_id  = p_localizacao_id
        OR m.localizacao_destino_id = p_localizacao_id
      )
  ),
  ord AS (
    SELECT
      b.*,
      v_saldo_inicial + SUM(b.delta) OVER (
        ORDER BY b.data_movimento, b.id
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS saldo_acumulado,
      COUNT(*) OVER () AS total_count
    FROM base b
  )
  SELECT
    o.id,
    o.data_movimento,
    o.tipo,
    o.documento_ref,
    CASE WHEN o.delta > 0 THEN o.delta ELSE 0 END::numeric  AS qtd_entrada,
    CASE WHEN o.delta < 0 THEN -o.delta ELSE 0 END::numeric AS qtd_saida,
    o.saldo_acumulado::numeric,
    o.custo_unitario::numeric,
    (ABS(o.delta) * o.custo_unitario)::numeric AS custo_total,
    o.localizacao_origem_id,
    o.localizacao_destino_id,
    o.observacoes,
    o.total_count
  FROM ord o
  ORDER BY o.data_movimento DESC, o.id DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_kardex_produto(uuid,uuid,uuid,date,date,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_kardex_produto(uuid,uuid,uuid,date,date,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_kardex_produto(uuid,uuid,uuid,date,date,integer,integer) TO service_role;

COMMENT ON FUNCTION public.fn_kardex_produto IS
'P14.1 Kardex por produto: retorna movimentações com saldo acumulado (window). Tenant-safe via user_has_access_to_empresa. Paginação server-side via p_limit/p_offset. total_count devolvido em cada linha para UI.';
