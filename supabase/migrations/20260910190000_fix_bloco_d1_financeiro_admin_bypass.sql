-- Bloco D1: aprovação, transferência bancária e projeções de fluxo de caixa.
-- Mesmo padrão e mesmo fix dos blocos anteriores.
--   fn_fluxo_caixa_projecao, fn_fluxo_caixa_resumo, solicitar_aprovacao,
--   transferencia_bancaria_atomica

CREATE OR REPLACE FUNCTION public.fn_fluxo_caixa_projecao(p_empresa_id uuid, p_dias integer DEFAULT 30)
 RETURNS TABLE(data date, entradas_previstas numeric, saidas_previstas numeric, saldo_acumulado numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.fn_fluxo_caixa_resumo(p_empresa_id uuid, p_data_inicio date, p_data_fim date, p_tipo_movimento text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_tipo_fluxo text DEFAULT NULL::text, p_conta_bancaria_id uuid DEFAULT NULL::uuid, p_plano_conta_id uuid DEFAULT NULL::uuid, p_centro_custo_id uuid DEFAULT NULL::uuid, p_busca text DEFAULT NULL::text)
 RETURNS TABLE(total_entradas numeric, total_saidas numeric, saldo_atual numeric, saldo_projetado_7d numeric, saldo_projetado_14d numeric, saldo_projetado_30d numeric, capital_giro numeric, runway_dias integer, saldo_minimo numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.solicitar_aprovacao(p_empresa_id uuid, p_categoria text, p_valor numeric, p_descricao text, p_contexto jsonb DEFAULT NULL::jsonb, p_origem_tabela text DEFAULT NULL::text, p_origem_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_alcada public.alcadas_aprovacao;
  v_id uuid;
  v_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN
    RAISE EXCEPTION 'VALOR_INVALIDO' USING ERRCODE = 'P0001';
  END IF;
  IF p_categoria IS NULL OR length(trim(p_categoria)) = 0 THEN
    RAISE EXCEPTION 'CATEGORIA_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;
  IF p_descricao IS NULL OR length(trim(p_descricao)) = 0 THEN
    RAISE EXCEPTION 'DESCRICAO_OBRIGATORIA' USING ERRCODE = 'P0001';
  END IF;

  v_alcada := public.resolver_alcada(p_empresa_id, p_categoria, p_valor);
  v_status := CASE WHEN v_alcada.id IS NULL THEN 'AUTO_APROVADO' ELSE 'PENDENTE' END;

  INSERT INTO public.solicitacoes_aprovacao (
    empresa_representada_id, categoria, valor, descricao, contexto,
    origem_tabela, origem_id, solicitante_id, alcada_id, permissao_necessaria,
    status, decidido_em, justificativa_decisao
  ) VALUES (
    p_empresa_id, trim(p_categoria), p_valor, trim(p_descricao), p_contexto,
    p_origem_tabela, p_origem_id, auth.uid(), v_alcada.id, v_alcada.permissao_necessaria,
    v_status,
    CASE WHEN v_status = 'AUTO_APROVADO' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'AUTO_APROVADO' THEN 'Sem alçada configurada para esta categoria/valor.' ELSE NULL END
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'solicitacao_id', v_id, 'status', v_status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.transferencia_bancaria_atomica(p_empresa_id uuid, p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric, p_data_lancamento date, p_descricao text, p_lote_descricao text, p_natureza_id uuid, p_plano_conta_id uuid, p_centro_custo_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lote_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner')
     AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied for empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lotes_movimentacoes (empresa_representada_id, tipo, descricao, valor_total, data_lancamento)
  VALUES (p_empresa_id, 'TRANSFERENCIA', p_lote_descricao, p_valor, p_data_lancamento)
  RETURNING id INTO v_lote_id;

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, conta_destino_id, lote_id, tipo, tipo_movimentacao, valor,
    data_lancamento, data_movimentacao, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_origem_id, p_conta_destino_id, v_lote_id, 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_SAIDA', p_valor,
    p_data_lancamento, p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, conta_destino_id, lote_id, tipo, tipo_movimentacao, valor,
    data_lancamento, data_movimentacao, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_destino_id, p_conta_origem_id, v_lote_id, 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_ENTRADA', p_valor,
    p_data_lancamento, p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  RETURN v_lote_id;
END;
$function$;
