
-- ============================================================
-- FASE 1: Recorrência
-- ============================================================
ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS origem_recorrencia_id UUID REFERENCES public.contas_pagar(id) ON DELETE SET NULL;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS origem_recorrencia_id UUID REFERENCES public.contas_receber(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_pagar_recorrencia
  ON public.contas_pagar (origem_recorrencia_id, numero_parcela)
  WHERE origem_recorrencia_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_receber_recorrencia
  ON public.contas_receber (origem_recorrencia_id, numero_parcela)
  WHERE origem_recorrencia_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contas_pagar_origem_recorrencia
  ON public.contas_pagar (origem_recorrencia_id) WHERE origem_recorrencia_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contas_receber_origem_recorrencia
  ON public.contas_receber (origem_recorrencia_id) WHERE origem_recorrencia_id IS NOT NULL;

-- Helper: intervalo em meses por periodicidade
CREATE OR REPLACE FUNCTION public.periodicidade_meses(p_periodicidade TEXT)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE upper(p_periodicidade)
    WHEN 'MENSAL' THEN 1
    WHEN 'BIMESTRAL' THEN 2
    WHEN 'TRIMESTRAL' THEN 3
    WHEN 'SEMESTRAL' THEN 6
    WHEN 'ANUAL' THEN 12
    ELSE NULL
  END
$$;

-- RPC: materializar próximas parcelas de séries recorrentes
CREATE OR REPLACE FUNCTION public.materializar_recorrencias(p_dias_antecedencia INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pagar    INTEGER := 0;
  v_receber  INTEGER := 0;
  v_erros    JSONB   := '[]'::jsonb;
  r          RECORD;
  v_meses    INTEGER;
  v_novo_num INTEGER;
  v_novo_id  UUID;
  v_prox_venc DATE;
  v_prox_comp DATE;
BEGIN
  -- Contas a PAGAR
  FOR r IN
    SELECT cp.*
    FROM public.contas_pagar cp
    WHERE cp.recorrente = true
      AND cp.deleted_at IS NULL
      AND cp.periodicidade IS NOT NULL
      AND cp.data_vencimento <= (CURRENT_DATE + p_dias_antecedencia)
      AND NOT EXISTS (
        SELECT 1 FROM public.contas_pagar filho
        WHERE filho.origem_recorrencia_id = cp.id
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_meses := public.periodicidade_meses(r.periodicidade);
      IF v_meses IS NULL THEN CONTINUE; END IF;

      v_novo_num := COALESCE(r.numero_parcela, 1) + 1;
      IF r.total_parcelas IS NOT NULL AND v_novo_num > r.total_parcelas THEN
        UPDATE public.contas_pagar SET recorrente = false WHERE id = r.id;
        CONTINUE;
      END IF;

      v_prox_venc := r.data_vencimento + (v_meses || ' months')::interval;
      v_prox_comp := CASE
        WHEN r.data_competencia IS NOT NULL
          THEN (r.data_competencia + (v_meses || ' months')::interval)::date
        ELSE v_prox_venc
      END;

      INSERT INTO public.contas_pagar (
        empresa_representada_id, fornecedor_id, plano_conta_id, centro_custo_id,
        numero_documento, descricao, valor_original,
        data_emissao, data_vencimento, data_competencia,
        status, observacoes,
        numero_parcela, total_parcelas,
        recorrente, periodicidade, origem_recorrencia_id
      ) VALUES (
        r.empresa_representada_id, r.fornecedor_id, r.plano_conta_id, r.centro_custo_id,
        r.numero_documento, r.descricao, r.valor_original,
        CURRENT_DATE, v_prox_venc, v_prox_comp,
        'PENDENTE', r.observacoes,
        v_novo_num, r.total_parcelas,
        true, r.periodicidade, r.id
      ) RETURNING id INTO v_novo_id;

      -- Replicar rateios
      INSERT INTO public.rateios_contas_pagar (
        conta_pagar_id, plano_conta_id, centro_custo_id, valor, percentual, descricao
      )
      SELECT v_novo_id, plano_conta_id, centro_custo_id, valor, percentual, descricao
      FROM public.rateios_contas_pagar WHERE conta_pagar_id = r.id;

      v_pagar := v_pagar + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('tabela','contas_pagar','id',r.id,'erro',SQLERRM);
    END;
  END LOOP;

  -- Contas a RECEBER
  FOR r IN
    SELECT cr.*
    FROM public.contas_receber cr
    WHERE cr.recorrente = true
      AND cr.deleted_at IS NULL
      AND cr.periodicidade IS NOT NULL
      AND cr.data_vencimento <= (CURRENT_DATE + p_dias_antecedencia)
      AND NOT EXISTS (
        SELECT 1 FROM public.contas_receber filho
        WHERE filho.origem_recorrencia_id = cr.id
      )
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      v_meses := public.periodicidade_meses(r.periodicidade);
      IF v_meses IS NULL THEN CONTINUE; END IF;

      v_novo_num := COALESCE(r.numero_parcela, 1) + 1;
      IF r.total_parcelas IS NOT NULL AND v_novo_num > r.total_parcelas THEN
        UPDATE public.contas_receber SET recorrente = false WHERE id = r.id;
        CONTINUE;
      END IF;

      v_prox_venc := r.data_vencimento + (v_meses || ' months')::interval;
      v_prox_comp := CASE
        WHEN r.data_competencia IS NOT NULL
          THEN (r.data_competencia + (v_meses || ' months')::interval)::date
        ELSE v_prox_venc
      END;

      INSERT INTO public.contas_receber (
        empresa_representada_id, cliente_id, plano_conta_id, centro_custo_id, natureza_id,
        numero_documento, descricao, valor_original,
        data_emissao, data_vencimento, data_competencia,
        status, observacoes,
        numero_parcela, total_parcelas,
        recorrente, periodicidade, origem_recorrencia_id,
        origem_sistema
      ) VALUES (
        r.empresa_representada_id, r.cliente_id, r.plano_conta_id, r.centro_custo_id, r.natureza_id,
        r.numero_documento, r.descricao, r.valor_original,
        CURRENT_DATE, v_prox_venc, v_prox_comp,
        'PENDENTE', r.observacoes,
        v_novo_num, r.total_parcelas,
        true, r.periodicidade, r.id,
        'RECORRENCIA_JOB'
      ) RETURNING id INTO v_novo_id;

      INSERT INTO public.rateios_contas_receber (
        empresa_representada_id, conta_receber_id, plano_conta_id, centro_custo_id, valor, percentual, observacoes
      )
      SELECT r.empresa_representada_id, v_novo_id, plano_conta_id, centro_custo_id, valor, percentual, observacoes
      FROM public.rateios_contas_receber WHERE conta_receber_id = r.id;

      v_receber := v_receber + 1;
    EXCEPTION WHEN OTHERS THEN
      v_erros := v_erros || jsonb_build_object('tabela','contas_receber','id',r.id,'erro',SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'gerados_pagar', v_pagar,
    'gerados_receber', v_receber,
    'erros', v_erros,
    'executado_em', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.materializar_recorrencias(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.materializar_recorrencias(INTEGER) TO service_role;

-- ============================================================
-- FASE 2: Relatório por Competência
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_fluxo_competencia AS
SELECT
  cp.empresa_representada_id,
  date_trunc('month', cp.data_competencia)::date AS ano_mes,
  'DESPESA'::text                                AS tipo,
  cp.plano_conta_id,
  cp.centro_custo_id,
  SUM(cp.valor_original)                          AS valor_previsto,
  SUM(COALESCE(cp.valor_pago, 0))                 AS valor_realizado,
  COUNT(*)                                        AS qtd_titulos
FROM public.contas_pagar cp
WHERE cp.deleted_at IS NULL AND cp.data_competencia IS NOT NULL
GROUP BY cp.empresa_representada_id, date_trunc('month', cp.data_competencia), cp.plano_conta_id, cp.centro_custo_id
UNION ALL
SELECT
  cr.empresa_representada_id,
  date_trunc('month', cr.data_competencia)::date AS ano_mes,
  'RECEITA'::text                                AS tipo,
  cr.plano_conta_id,
  cr.centro_custo_id,
  SUM(cr.valor_original)                          AS valor_previsto,
  SUM(COALESCE(cr.valor_recebido, 0))             AS valor_realizado,
  COUNT(*)                                        AS qtd_titulos
FROM public.contas_receber cr
WHERE cr.deleted_at IS NULL AND cr.data_competencia IS NOT NULL
GROUP BY cr.empresa_representada_id, date_trunc('month', cr.data_competencia), cr.plano_conta_id, cr.centro_custo_id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_fluxo_competencia
  ON public.mv_fluxo_competencia (empresa_representada_id, ano_mes, tipo, COALESCE(plano_conta_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(centro_custo_id, '00000000-0000-0000-0000-000000000000'::uuid));

REVOKE ALL ON public.mv_fluxo_competencia FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mv_fluxo_competencia TO service_role;

-- RPC: relatório agregado por mês, respeitando tenant e admin
CREATE OR REPLACE FUNCTION public.relatorio_fluxo_competencia(
  p_data_ini DATE,
  p_data_fim DATE,
  p_empresa_id UUID DEFAULT NULL
)
RETURNS TABLE (
  ano_mes DATE,
  receita_prevista NUMERIC,
  receita_realizada NUMERIC,
  despesa_prevista NUMERIC,
  despesa_realizada NUMERIC,
  saldo_competencia NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  v_admin := public.has_role(auth.uid(), 'admin');

  IF NOT v_admin AND p_empresa_id IS NOT NULL
     AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    mv.ano_mes,
    SUM(CASE WHEN mv.tipo = 'RECEITA' THEN mv.valor_previsto ELSE 0 END) AS receita_prevista,
    SUM(CASE WHEN mv.tipo = 'RECEITA' THEN mv.valor_realizado ELSE 0 END) AS receita_realizada,
    SUM(CASE WHEN mv.tipo = 'DESPESA' THEN mv.valor_previsto ELSE 0 END) AS despesa_prevista,
    SUM(CASE WHEN mv.tipo = 'DESPESA' THEN mv.valor_realizado ELSE 0 END) AS despesa_realizada,
    SUM(CASE WHEN mv.tipo = 'RECEITA' THEN mv.valor_realizado ELSE -mv.valor_realizado END) AS saldo_competencia
  FROM public.mv_fluxo_competencia mv
  WHERE mv.ano_mes BETWEEN date_trunc('month', p_data_ini)::date AND date_trunc('month', p_data_fim)::date
    AND (p_empresa_id IS NULL OR mv.empresa_representada_id = p_empresa_id)
    AND (v_admin OR public.user_has_access_to_empresa(mv.empresa_representada_id))
  GROUP BY mv.ano_mes
  ORDER BY mv.ano_mes;
END;
$$;

REVOKE ALL ON FUNCTION public.relatorio_fluxo_competencia(DATE, DATE, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_fluxo_competencia(DATE, DATE, UUID) TO authenticated, service_role;

-- RPC: refresh manual da MV (chamada pelo cron)
CREATE OR REPLACE FUNCTION public.refresh_mv_fluxo_competencia()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_fluxo_competencia;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_mv_fluxo_competencia() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mv_fluxo_competencia() TO service_role;

-- Habilitar pg_cron e pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
