
-- =====================================================================
-- P14.2 — Relatórios Analíticos de Estoque
-- =====================================================================

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo_data
  ON public.estoque_movimentacoes (empresa_representada_id, tipo, data_movimento)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_saldos_empresa_produto
  ON public.estoque_saldos (empresa_representada_id, produto_id);

-- =====================================================================
-- 1) fn_relatorio_giro
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_relatorio_giro(
  p_empresa_id     uuid,
  p_data_inicio    date,
  p_data_fim       date,
  p_categoria_id   uuid DEFAULT NULL,
  p_localizacao_id uuid DEFAULT NULL
)
RETURNS TABLE (
  produto_id      uuid,
  codigo          text,
  nome            text,
  categoria_id    uuid,
  qtd_saida       numeric,
  saldo_inicial   numeric,
  saldo_final     numeric,
  estoque_medio   numeric,
  giro            numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.user_has_access_to_empresa(p_empresa_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado à empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH saidas AS (
    SELECT m.produto_id, SUM(m.quantidade) AS qtd
    FROM public.estoque_movimentacoes m
    WHERE m.empresa_representada_id = p_empresa_id
      AND m.deleted_at IS NULL
      AND m.tipo IN ('SAIDA','AJUSTE_NEGATIVO')
      AND m.data_movimento >= p_data_inicio::timestamptz
      AND m.data_movimento <  (p_data_fim::timestamptz + interval '1 day')
      AND (p_localizacao_id IS NULL OR m.localizacao_origem_id = p_localizacao_id)
    GROUP BY m.produto_id
  ),
  deltas AS (
    SELECT m.produto_id,
           SUM(CASE
             WHEN m.tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO')
                  AND (p_localizacao_id IS NULL OR m.localizacao_destino_id = p_localizacao_id) THEN m.quantidade
             WHEN m.tipo IN ('SAIDA','AJUSTE_NEGATIVO')
                  AND (p_localizacao_id IS NULL OR m.localizacao_origem_id = p_localizacao_id) THEN -m.quantidade
             WHEN m.tipo = 'TRANSFERENCIA' AND p_localizacao_id IS NOT NULL THEN
               CASE WHEN m.localizacao_destino_id = p_localizacao_id THEN m.quantidade
                    WHEN m.localizacao_origem_id  = p_localizacao_id THEN -m.quantidade ELSE 0 END
             ELSE 0
           END) AS delta_periodo,
           SUM(CASE
             WHEN m.data_movimento < p_data_inicio::timestamptz THEN
               CASE
                 WHEN m.tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO')
                      AND (p_localizacao_id IS NULL OR m.localizacao_destino_id = p_localizacao_id) THEN m.quantidade
                 WHEN m.tipo IN ('SAIDA','AJUSTE_NEGATIVO')
                      AND (p_localizacao_id IS NULL OR m.localizacao_origem_id = p_localizacao_id) THEN -m.quantidade
                 WHEN m.tipo = 'TRANSFERENCIA' AND p_localizacao_id IS NOT NULL THEN
                   CASE WHEN m.localizacao_destino_id = p_localizacao_id THEN m.quantidade
                        WHEN m.localizacao_origem_id  = p_localizacao_id THEN -m.quantidade ELSE 0 END
                 ELSE 0
               END
             ELSE 0
           END) AS delta_anterior
    FROM public.estoque_movimentacoes m
    WHERE m.empresa_representada_id = p_empresa_id
      AND m.deleted_at IS NULL
      AND m.data_movimento < (p_data_fim::timestamptz + interval '1 day')
    GROUP BY m.produto_id
  )
  SELECT
    p.id AS produto_id,
    p.codigo::text,
    p.nome::text,
    p.categoria_id,
    COALESCE(s.qtd, 0)::numeric AS qtd_saida,
    COALESCE(d.delta_anterior, 0)::numeric AS saldo_inicial,
    (COALESCE(d.delta_anterior, 0) + COALESCE(d.delta_periodo, 0))::numeric AS saldo_final,
    ((COALESCE(d.delta_anterior, 0) + (COALESCE(d.delta_anterior, 0) + COALESCE(d.delta_periodo, 0))) / 2.0)::numeric AS estoque_medio,
    CASE
      WHEN (COALESCE(d.delta_anterior, 0) + (COALESCE(d.delta_anterior, 0) + COALESCE(d.delta_periodo, 0))) / 2.0 > 0
        THEN (COALESCE(s.qtd, 0) / ((COALESCE(d.delta_anterior, 0) + (COALESCE(d.delta_anterior, 0) + COALESCE(d.delta_periodo, 0))) / 2.0))::numeric
      ELSE NULL
    END AS giro
  FROM public.produtos p
  LEFT JOIN saidas s ON s.produto_id = p.id
  LEFT JOIN deltas d ON d.produto_id = p.id
  WHERE p.empresa_representada_id = p_empresa_id
    AND p.deleted_at IS NULL
    AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
  ORDER BY qtd_saida DESC NULLS LAST;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_relatorio_giro(uuid,date,date,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_relatorio_giro(uuid,date,date,uuid,uuid) TO authenticated, service_role;

-- =====================================================================
-- 2) mv_estoque_curva_abc + fn_curva_abc
-- =====================================================================
DROP MATERIALIZED VIEW IF EXISTS public.mv_estoque_curva_abc;
CREATE MATERIALIZED VIEW public.mv_estoque_curva_abc AS
WITH saidas_12m AS (
  SELECT m.empresa_representada_id AS empresa_id,
         m.produto_id,
         SUM(m.quantidade)                    AS qtd_saida,
         SUM(m.quantidade * m.custo_unitario) AS valor_saida
  FROM public.estoque_movimentacoes m
  WHERE m.deleted_at IS NULL
    AND m.tipo = 'SAIDA'
    AND m.data_movimento >= now() - interval '12 months'
  GROUP BY m.empresa_representada_id, m.produto_id
),
ranked AS (
  SELECT s.empresa_id, s.produto_id, s.qtd_saida, s.valor_saida,
         SUM(s.valor_saida) OVER (PARTITION BY s.empresa_id) AS valor_total_empresa,
         SUM(s.valor_saida) OVER (
           PARTITION BY s.empresa_id ORDER BY s.valor_saida DESC
           ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
         ) AS valor_acumulado
  FROM saidas_12m s
)
SELECT r.empresa_id,
       r.produto_id,
       r.qtd_saida,
       r.valor_saida,
       CASE WHEN r.valor_total_empresa > 0
            THEN (r.valor_acumulado / r.valor_total_empresa) ELSE 0 END AS percentual_acumulado,
       CASE
         WHEN r.valor_total_empresa <= 0 THEN 'C'
         WHEN (r.valor_acumulado / r.valor_total_empresa) <= 0.80 THEN 'A'
         WHEN (r.valor_acumulado / r.valor_total_empresa) <= 0.95 THEN 'B'
         ELSE 'C'
       END AS classe,
       now() AS refreshed_at
FROM ranked r;

CREATE UNIQUE INDEX IF NOT EXISTS mv_estoque_curva_abc_pk
  ON public.mv_estoque_curva_abc (empresa_id, produto_id);
CREATE INDEX IF NOT EXISTS mv_estoque_curva_abc_empresa
  ON public.mv_estoque_curva_abc (empresa_id, classe);

REVOKE ALL ON public.mv_estoque_curva_abc FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mv_estoque_curva_abc TO service_role;

CREATE OR REPLACE FUNCTION public.fn_curva_abc(
  p_empresa_id   uuid,
  p_categoria_id uuid    DEFAULT NULL,
  p_limit        integer DEFAULT 200,
  p_offset       integer DEFAULT 0
)
RETURNS TABLE (
  produto_id           uuid,
  codigo               text,
  nome                 text,
  categoria_id         uuid,
  qtd_saida            numeric,
  valor_saida          numeric,
  percentual_acumulado numeric,
  classe               text,
  refreshed_at         timestamptz,
  total_count          bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.user_has_access_to_empresa(p_empresa_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado à empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT mv.produto_id, mv.qtd_saida, mv.valor_saida, mv.percentual_acumulado, mv.classe, mv.refreshed_at,
           p.codigo::text AS codigo, p.nome::text AS nome, p.categoria_id
    FROM public.mv_estoque_curva_abc mv
    JOIN public.produtos p ON p.id = mv.produto_id AND p.deleted_at IS NULL
    WHERE mv.empresa_id = p_empresa_id
      AND (p_categoria_id IS NULL OR p.categoria_id = p_categoria_id)
  ),
  counted AS (
    SELECT b.*, COUNT(*) OVER () AS total_count FROM base b
  )
  SELECT c.produto_id, c.codigo, c.nome, c.categoria_id,
         c.qtd_saida::numeric, c.valor_saida::numeric, c.percentual_acumulado::numeric,
         c.classe::text, c.refreshed_at, c.total_count
  FROM counted c
  ORDER BY c.valor_saida DESC NULLS LAST
  LIMIT GREATEST(p_limit, 1) OFFSET GREATEST(p_offset, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_curva_abc(uuid,uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_curva_abc(uuid,uuid,integer,integer) TO authenticated, service_role;

-- Refresh helper + agendamento diário via pg_cron
CREATE OR REPLACE FUNCTION public.fn_refresh_mv_curva_abc()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_estoque_curva_abc;
EXCEPTION WHEN OTHERS THEN
  REFRESH MATERIALIZED VIEW public.mv_estoque_curva_abc;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_refresh_mv_curva_abc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_refresh_mv_curva_abc() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cron_refresh_mv_curva_abc';
    PERFORM cron.schedule(
      'cron_refresh_mv_curva_abc',
      '0 3 * * *',
      $cron$SELECT public.fn_refresh_mv_curva_abc();$cron$
    );
  END IF;
END $$;

-- =====================================================================
-- 3) fn_produtos_parados
-- =====================================================================
CREATE OR REPLACE FUNCTION public.fn_produtos_parados(
  p_empresa_id uuid,
  p_dias       integer DEFAULT 90
)
RETURNS TABLE (
  produto_id       uuid,
  codigo           text,
  nome             text,
  categoria_id     uuid,
  saldo_total      numeric,
  custo_medio      numeric,
  valor_imobilizado numeric,
  ultima_saida     timestamptz,
  dias_parado      integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (public.user_has_access_to_empresa(p_empresa_id)
          OR public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado à empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH saldos AS (
    SELECT s.produto_id,
           SUM(s.quantidade) AS saldo_total,
           AVG(NULLIF(s.custo_medio, 0)) AS custo_medio
    FROM public.estoque_saldos s
    WHERE s.empresa_representada_id = p_empresa_id
    GROUP BY s.produto_id
  ),
  ult_saida AS (
    SELECT m.produto_id, MAX(m.data_movimento) AS ultima_saida
    FROM public.estoque_movimentacoes m
    WHERE m.empresa_representada_id = p_empresa_id
      AND m.deleted_at IS NULL
      AND m.tipo = 'SAIDA'
    GROUP BY m.produto_id
  )
  SELECT p.id,
         p.codigo::text,
         p.nome::text,
         p.categoria_id,
         COALESCE(sa.saldo_total, 0)::numeric,
         COALESCE(sa.custo_medio, 0)::numeric,
         (COALESCE(sa.saldo_total, 0) * COALESCE(sa.custo_medio, 0))::numeric,
         us.ultima_saida,
         EXTRACT(day FROM (now() - COALESCE(us.ultima_saida, p.created_at)))::integer AS dias_parado
  FROM public.produtos p
  LEFT JOIN saldos    sa ON sa.produto_id = p.id
  LEFT JOIN ult_saida us ON us.produto_id = p.id
  WHERE p.empresa_representada_id = p_empresa_id
    AND p.deleted_at IS NULL
    AND COALESCE(sa.saldo_total, 0) > 0
    AND (us.ultima_saida IS NULL OR us.ultima_saida < now() - make_interval(days => p_dias))
  ORDER BY (COALESCE(sa.saldo_total, 0) * COALESCE(sa.custo_medio, 0)) DESC NULLS LAST;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_produtos_parados(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_produtos_parados(uuid,integer) TO authenticated, service_role;

-- =====================================================================
-- 4) vw_estoque_posicao_localizacao (security_invoker → herda RLS)
-- =====================================================================
DROP VIEW IF EXISTS public.vw_estoque_posicao_localizacao;
CREATE VIEW public.vw_estoque_posicao_localizacao
  WITH (security_invoker = true) AS
SELECT
  s.empresa_representada_id AS empresa_id,
  s.produto_id,
  p.codigo   AS produto_codigo,
  p.nome     AS produto_nome,
  p.categoria_id,
  s.localizacao_id,
  l.nome     AS localizacao_nome,
  s.quantidade,
  s.custo_medio,
  (s.quantidade * s.custo_medio) AS valor_total
FROM public.estoque_saldos s
JOIN public.produtos            p ON p.id = s.produto_id
JOIN public.localizacoes_estoque l ON l.id = s.localizacao_id
WHERE p.deleted_at IS NULL;
GRANT SELECT ON public.vw_estoque_posicao_localizacao TO authenticated, service_role;

-- =====================================================================
-- 5) vw_estoque_ruptura (security_invoker)
-- =====================================================================
DROP VIEW IF EXISTS public.vw_estoque_ruptura;
CREATE VIEW public.vw_estoque_ruptura
  WITH (security_invoker = true) AS
WITH saldo_agg AS (
  SELECT s.empresa_representada_id, s.produto_id, SUM(s.quantidade) AS saldo_total
  FROM public.estoque_saldos s
  GROUP BY s.empresa_representada_id, s.produto_id
)
SELECT
  p.empresa_representada_id AS empresa_id,
  p.id                       AS produto_id,
  p.codigo                   AS produto_codigo,
  p.nome                     AS produto_nome,
  p.categoria_id,
  COALESCE(sa.saldo_total, 0) AS saldo_total,
  COALESCE(p.estoque_minimo, 0) AS estoque_minimo,
  CASE
    WHEN COALESCE(sa.saldo_total, 0) <= 0                                THEN 'RUPTURA'
    WHEN COALESCE(sa.saldo_total, 0) <= COALESCE(p.estoque_minimo, 0)    THEN 'ABAIXO_MINIMO'
    ELSE 'OK'
  END AS status
FROM public.produtos p
LEFT JOIN saldo_agg sa
  ON sa.produto_id = p.id AND sa.empresa_representada_id = p.empresa_representada_id
WHERE p.deleted_at IS NULL
  AND p.ativo = true
  AND COALESCE(p.controla_estoque, true) = true
  AND (COALESCE(sa.saldo_total, 0) <= COALESCE(p.estoque_minimo, 0));
GRANT SELECT ON public.vw_estoque_ruptura TO authenticated, service_role;

-- Refresh inicial da MV
SELECT public.fn_refresh_mv_curva_abc();
