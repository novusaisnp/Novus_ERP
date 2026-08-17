-- ============================================================
-- AUDITORIA_NOVA Fase 5 (item 3/3, escopo reduzido a Fluxo de Caixa):
-- agregação de indicadores no Postgres em vez de somar no navegador.
--
-- useFluxoCaixa.ts disparava 4 queries independentes por carregamento de
-- página; 3 delas (resumo, projeção, estatísticas) cada uma re-buscava do
-- zero contas_pagar + contas_receber + liquidacoes_titulos inteiras (sem
-- paginação) só para somar em JS. Esta migration move resumo e projeção
-- para agregação real no Postgres (2 RPCs), no mesmo padrão de
-- relatorio_fluxo_competencia (20260711172224). "estatísticas" (maior
-- entrada/saída + médias) fica derivada em memória do array de
-- movimentações que a página já busca de qualquer forma — não precisa de
-- outra query, então não ganha RPC própria.
--
-- Replica fielmente a lógica de negócio existente em fluxoCaixaService.ts,
-- inclusive suas particularidades: filtro por plano_conta_id/centro_custo_id
-- só atinge SAIDA (contas_receber nunca teve esses campos no item), filtro
-- por conta_bancaria_id só atinge itens REALIZADO (PREVISTO nunca tem
-- conta_bancaria), tipo_fluxo é sempre 'OPERACIONAL' (não há coluna real),
-- e quando um título tem mais de uma liquidação não cancelada, apenas uma é
-- considerada (schema simplificado, comentário original: "Liquidações
-- múltiplas: schema simplificado — não usadas como movimentação direta").
-- Nenhum desses comportamentos é corrigido aqui — só transportado para SQL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_fluxo_caixa_resumo(
  p_empresa_id UUID,
  p_data_inicio DATE,
  p_data_fim DATE,
  p_tipo_movimento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tipo_fluxo TEXT DEFAULT NULL,
  p_conta_bancaria_id UUID DEFAULT NULL,
  p_plano_conta_id UUID DEFAULT NULL,
  p_centro_custo_id UUID DEFAULT NULL,
  p_busca TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_entradas NUMERIC,
  total_saidas NUMERIC,
  saldo_atual NUMERIC,
  saldo_projetado_7d NUMERIC,
  saldo_projetado_14d NUMERIC,
  saldo_projetado_30d NUMERIC,
  capital_giro NUMERIC,
  runway_dias INTEGER,
  saldo_minimo NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH liq_pagar AS (
    SELECT DISTINCT ON (conta_pagar_id)
      conta_pagar_id, data_liquidacao, valor_pago, conta_bancaria_id
    FROM public.liquidacoes_titulos
    WHERE cancelada = false AND conta_pagar_id IS NOT NULL
    ORDER BY conta_pagar_id, data_liquidacao
  ),
  liq_receber AS (
    SELECT DISTINCT ON (conta_receber_id)
      conta_receber_id, data_liquidacao, valor_pago, conta_bancaria_id
    FROM public.liquidacoes_titulos
    WHERE cancelada = false AND conta_receber_id IS NOT NULL
    ORDER BY conta_receber_id, data_liquidacao
  ),
  movs_raw AS (
    SELECT
      COALESCE(lp.data_liquidacao, cp.data_vencimento)::date AS data,
      'SAIDA'::text AS tipo,
      COALESCE(lp.valor_pago, cp.valor_original) AS valor,
      CASE WHEN lp.conta_pagar_id IS NOT NULL THEN 'REALIZADO' ELSE 'PREVISTO' END AS status,
      lp.conta_bancaria_id AS conta_bancaria_id,
      cp.plano_conta_id,
      cp.centro_custo_id,
      COALESCE(cp.descricao, '') AS descricao,
      COALESCE(cp.numero_documento, '') AS numero_documento,
      cp.observacoes
    FROM public.contas_pagar cp
    LEFT JOIN liq_pagar lp ON lp.conta_pagar_id = cp.id
    WHERE cp.empresa_representada_id = p_empresa_id
      AND cp.deleted_at IS NULL
      AND cp.data_vencimento BETWEEN p_data_inicio AND p_data_fim
    UNION ALL
    SELECT
      COALESCE(lr.data_liquidacao, cr.data_vencimento)::date AS data,
      'ENTRADA'::text AS tipo,
      COALESCE(lr.valor_pago, cr.valor_original) AS valor,
      CASE WHEN lr.conta_receber_id IS NOT NULL THEN 'REALIZADO' ELSE 'PREVISTO' END AS status,
      lr.conta_bancaria_id AS conta_bancaria_id,
      NULL::uuid AS plano_conta_id,
      NULL::uuid AS centro_custo_id,
      COALESCE(e.nome, 'Receita') AS descricao,
      COALESCE(cr.numero_documento, '') AS numero_documento,
      cr.observacoes
    FROM public.contas_receber cr
    LEFT JOIN liq_receber lr ON lr.conta_receber_id = cr.id
    LEFT JOIN public.entidades e ON e.id = cr.cliente_id
    WHERE cr.empresa_representada_id = p_empresa_id
      AND cr.deleted_at IS NULL
      AND cr.data_vencimento BETWEEN p_data_inicio AND p_data_fim
  ),
  movs AS (
    SELECT * FROM movs_raw m
    WHERE (p_tipo_movimento IS NULL OR p_tipo_movimento = 'TODOS' OR m.tipo = p_tipo_movimento)
      AND (p_status IS NULL OR p_status = 'TODOS' OR m.status = p_status)
      AND (p_tipo_fluxo IS NULL OR p_tipo_fluxo = 'TODOS' OR p_tipo_fluxo = 'OPERACIONAL')
      AND (p_conta_bancaria_id IS NULL OR m.conta_bancaria_id = p_conta_bancaria_id)
      AND (p_plano_conta_id IS NULL OR m.plano_conta_id = p_plano_conta_id)
      AND (p_centro_custo_id IS NULL OR m.centro_custo_id = p_centro_custo_id)
      AND (p_busca IS NULL OR p_busca = '' OR
           m.descricao ILIKE '%' || p_busca || '%' OR
           m.numero_documento ILIKE '%' || p_busca || '%' OR
           COALESCE(m.observacoes, '') ILIKE '%' || p_busca || '%')
  ),
  agg AS (
    SELECT
      COALESCE(SUM(valor) FILTER (WHERE tipo = 'ENTRADA'), 0) AS total_entradas,
      COALESCE(SUM(valor) FILTER (WHERE tipo = 'SAIDA'), 0) AS total_saidas,
      COALESCE(SUM(valor) FILTER (WHERE tipo = 'ENTRADA' AND status = 'REALIZADO'), 0)
        - COALESCE(SUM(valor) FILTER (WHERE tipo = 'SAIDA' AND status = 'REALIZADO'), 0) AS saldo_realizado,
      COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END)
                FILTER (WHERE data <= CURRENT_DATE + 7), 0) AS delta_7d,
      COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END)
                FILTER (WHERE data <= CURRENT_DATE + 14), 0) AS delta_14d,
      COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END)
                FILTER (WHERE data <= CURRENT_DATE + 30), 0) AS delta_30d
    FROM movs
  ),
  banco AS (
    SELECT COALESCE(SUM(cb.saldo_atual), 0) AS saldo_bancario
    FROM public.contas_bancarias cb
    WHERE cb.ativo = true AND cb.empresa_representada_id = p_empresa_id
  )
  SELECT
    agg.total_entradas,
    agg.total_saidas,
    (banco.saldo_bancario + agg.saldo_realizado) AS saldo_atual,
    (banco.saldo_bancario + agg.saldo_realizado + agg.delta_7d) AS saldo_projetado_7d,
    (banco.saldo_bancario + agg.saldo_realizado + agg.delta_14d) AS saldo_projetado_14d,
    (banco.saldo_bancario + agg.saldo_realizado + agg.delta_30d) AS saldo_projetado_30d,
    (banco.saldo_bancario + agg.saldo_realizado) * 0.7 AS capital_giro,
    (CASE WHEN agg.total_saidas / 30 > 0
          THEN floor((banco.saldo_bancario + agg.saldo_realizado) / (agg.total_saidas / 30))::int
          ELSE 999 END) AS runway_dias,
    ((banco.saldo_bancario + agg.saldo_realizado) * 0.7) * 0.1 AS saldo_minimo
  FROM agg, banco;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fluxo_caixa_resumo(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_fluxo_caixa_resumo(UUID, DATE, DATE, TEXT, TEXT, TEXT, UUID, UUID, UUID, TEXT) TO authenticated, service_role;

-- RPC: projeção dia a dia (independente dos filtros da página — mesmo
-- comportamento de getProjecaoFluxoCaixa(dias), que já ignorava filtros).
CREATE OR REPLACE FUNCTION public.fn_fluxo_caixa_projecao(
  p_empresa_id UUID,
  p_dias INTEGER DEFAULT 30
)
RETURNS TABLE (
  data DATE,
  entradas_previstas NUMERIC,
  saidas_previstas NUMERIC,
  saldo_acumulado NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH dias AS (
    SELECT generate_series(CURRENT_DATE, CURRENT_DATE + (p_dias - 1), interval '1 day')::date AS dia
  ),
  liq_pagar AS (
    SELECT DISTINCT ON (conta_pagar_id) conta_pagar_id, data_liquidacao, valor_pago
    FROM public.liquidacoes_titulos
    WHERE cancelada = false AND conta_pagar_id IS NOT NULL
    ORDER BY conta_pagar_id, data_liquidacao
  ),
  liq_receber AS (
    SELECT DISTINCT ON (conta_receber_id) conta_receber_id, data_liquidacao, valor_pago
    FROM public.liquidacoes_titulos
    WHERE cancelada = false AND conta_receber_id IS NOT NULL
    ORDER BY conta_receber_id, data_liquidacao
  ),
  movs AS (
    SELECT COALESCE(lp.data_liquidacao, cp.data_vencimento)::date AS data,
           'SAIDA'::text AS tipo,
           COALESCE(lp.valor_pago, cp.valor_original, 0) AS valor
    FROM public.contas_pagar cp
    LEFT JOIN liq_pagar lp ON lp.conta_pagar_id = cp.id
    WHERE cp.empresa_representada_id = p_empresa_id
      AND cp.deleted_at IS NULL
      AND COALESCE(lp.data_liquidacao, cp.data_vencimento)::date
          BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_dias - 1)
    UNION ALL
    SELECT COALESCE(lr.data_liquidacao, cr.data_vencimento)::date AS data,
           'ENTRADA'::text AS tipo,
           COALESCE(lr.valor_pago, cr.valor_original, 0) AS valor
    FROM public.contas_receber cr
    LEFT JOIN liq_receber lr ON lr.conta_receber_id = cr.id
    WHERE cr.empresa_representada_id = p_empresa_id
      AND cr.deleted_at IS NULL
      AND COALESCE(lr.data_liquidacao, cr.data_vencimento)::date
          BETWEEN CURRENT_DATE AND CURRENT_DATE + (p_dias - 1)
  ),
  por_dia AS (
    SELECT
      d.dia,
      COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'ENTRADA'), 0) AS entradas,
      COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'SAIDA'), 0) AS saidas
    FROM dias d
    LEFT JOIN movs m ON m.data = d.dia
    GROUP BY d.dia
  )
  SELECT
    dia,
    entradas,
    saidas,
    SUM(entradas - saidas) OVER (ORDER BY dia) AS saldo_acumulado
  FROM por_dia
  ORDER BY dia;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_fluxo_caixa_projecao(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_fluxo_caixa_projecao(UUID, INTEGER) TO authenticated, service_role;
