-- FIN-4 parte 2, fatia 2: DMPL (Demonstração das Mutações do Patrimônio
-- Líquido). Mesma filosofia da fatia 1 (Balanço + DRE, migration
-- 20260907180000) — função de LEITURA pura sobre o razão já existente,
-- nenhuma tabela nova, nenhum lançamento novo.
--
-- Pra cada conta PATRIMONIO (real ou a linha sintética "Resultado do
-- Período"), devolve saldo_inicial (acumulado até o dia anterior ao início
-- do período — mesma lógica de relatorio_balanco_patrimonial) + movimento
-- do período (lançamentos reais na conta, ou Receita-Despesa do período
-- para a linha sintética) + saldo_final = saldo_inicial + movimento. Por
-- construção, saldo_final de cada conta bate com
-- relatorio_balanco_patrimonial(empresa, data_fim), e saldo_inicial bate
-- com relatorio_balanco_patrimonial(empresa, data_inicio - 1).
--
-- Nota sobre o sinal do Resultado sintético: crédito−débito somado direto
-- sobre RECEITA+DESPESA já dá Receita−Despesa sem precisar inverter sinal
-- por tipo — uma conta RECEITA cresce a crédito (crédito−débito positivo
-- quando fatura) e uma conta DESPESA cresce a débito (crédito−débito
-- negativo quando gasta), então SOMAR os dois direto já é a subtração que
-- a gente quer.

CREATE OR REPLACE FUNCTION public.relatorio_dmpl(
  p_empresa_id uuid,
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  conta_id uuid,
  codigo character varying,
  nome character varying,
  nivel integer,
  conta_pai_id uuid,
  aceita_lancamento boolean,
  saldo_inicial numeric,
  movimento_periodo numeric,
  saldo_final numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pl_raiz_id uuid;
  v_data_corte_inicial date := p_data_inicio - 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'PERIODO_INVALIDO: data inicial posterior à data final' USING ERRCODE = 'P0001';
  END IF;

  SELECT pc.id INTO v_pl_raiz_id
  FROM public.plano_contas pc
  WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo = 'PATRIMONIO' AND pc.nivel = 1
  LIMIT 1;

  RETURN QUERY
  WITH mov_ate_inicio AS (
    SELECT i.conta_contabil_id,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE -i.valor END) AS saldo
    FROM public.lancamentos_contabeis_itens i
    JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id
    WHERE l.empresa_representada_id = p_empresa_id
      AND l.data_competencia <= v_data_corte_inicial
    GROUP BY i.conta_contabil_id
  ),
  mov_periodo AS (
    SELECT i.conta_contabil_id,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE -i.valor END) AS movimento
    FROM public.lancamentos_contabeis_itens i
    JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id
    WHERE l.empresa_representada_id = p_empresa_id
      AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    GROUP BY i.conta_contabil_id
  ),
  contas_pl AS (
    SELECT
      pc.id, pc.codigo, pc.nome, pc.nivel, pc.conta_pai_id, pc.aceita_lancamento,
      COALESCE(mi.saldo, 0) AS saldo_inicial,
      COALESCE(mp.movimento, 0) AS movimento_periodo
    FROM public.plano_contas pc
    LEFT JOIN mov_ate_inicio mi ON mi.conta_contabil_id = pc.id
    LEFT JOIN mov_periodo mp ON mp.conta_contabil_id = pc.id
    WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo = 'PATRIMONIO'
  ),
  resultado AS (
    SELECT
      COALESCE(SUM(mi.saldo), 0) AS resultado_ate_inicio,
      COALESCE(SUM(mp.movimento), 0) AS resultado_periodo
    FROM public.plano_contas pc
    LEFT JOIN mov_ate_inicio mi ON mi.conta_contabil_id = pc.id
    LEFT JOIN mov_periodo mp ON mp.conta_contabil_id = pc.id
    WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo IN ('RECEITA', 'DESPESA')
  ),
  linhas AS (
    SELECT
      cp.id, cp.codigo, cp.nome, cp.nivel, cp.conta_pai_id, cp.aceita_lancamento,
      cp.saldo_inicial, cp.movimento_periodo, cp.saldo_inicial + cp.movimento_periodo AS saldo_final
    FROM contas_pl cp
    UNION ALL
    SELECT
      NULL::uuid, 'RESULTADO'::character varying, 'Resultado do Período (não apurado)'::character varying,
      2, v_pl_raiz_id, false,
      r.resultado_ate_inicio, r.resultado_periodo, r.resultado_ate_inicio + r.resultado_periodo
    FROM resultado r
  )
  -- UNION ALL sozinho não garante ordem — mesmo fix aplicado em
  -- relatorio_balanco_patrimonial (migration 20260907180000).
  SELECT * FROM linhas ORDER BY codigo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.relatorio_dmpl(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_dmpl(uuid, date, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.relatorio_dmpl(uuid, date, date) IS
  'FIN-4 parte 2 (fatia 2): DMPL — saldo inicial, movimento do período e saldo final por conta PATRIMONIO (mais a linha sintética "Resultado do Período"). saldo_final de cada conta bate com relatorio_balanco_patrimonial(empresa, data_fim); saldo_inicial bate com relatorio_balanco_patrimonial(empresa, data_inicio - 1).';
