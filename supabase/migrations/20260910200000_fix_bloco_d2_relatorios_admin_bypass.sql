-- Bloco D2: relatórios contábeis. Mesmo padrão dos blocos anteriores em 4
-- funções (relatorio_balanco_patrimonial, relatorio_dfc_indireto,
-- relatorio_dmpl, relatorio_dre).
--
-- relatorio_fluxo_competencia tinha uma variante mais grave: quando chamada
-- sem p_empresa_id, a checagem de acesso inicial era pulada inteira
-- (`p_empresa_id IS NOT NULL AND ...`) e o filtro de linha final
-- `(v_admin OR user_has_access_to_empresa(...))` deixava QUALQUER admin
-- (global) ver dado agregado (receita/despesa prevista/realizada) de TODAS
-- as empresas somado por mês — nem precisa indicar qual empresa quer atacar,
-- só omitir o parâmetro. Fix: troca v_admin de has_role(admin) pra
-- has_role(novus_owner), mesmo bypass já formalizado em has_role_for_empresa.

CREATE OR REPLACE FUNCTION public.relatorio_balanco_patrimonial(p_empresa_id uuid, p_data_corte date DEFAULT CURRENT_DATE)
 RETURNS TABLE(conta_id uuid, codigo character varying, nome character varying, tipo character varying, natureza character varying, nivel integer, conta_pai_id uuid, aceita_lancamento boolean, saldo numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pl_raiz_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  -- Linha sintética de resultado precisa ser FILHA real da conta raiz de
  -- PATRIMONIO (nivel 1) — senão vira uma segunda "raiz" independente e o
  -- modo Sintético (que só desce até nivel 1) não consegue colapsá-la no
  -- mesmo total do grupo.
  SELECT pc.id INTO v_pl_raiz_id
  FROM public.plano_contas pc
  WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo = 'PATRIMONIO' AND pc.nivel = 1
  LIMIT 1;

  RETURN QUERY
  WITH movimentos AS (
    SELECT
      i.conta_contabil_id,
      SUM(CASE WHEN i.tipo_partida = 'DEBITO' THEN i.valor ELSE 0 END) AS debito,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE 0 END) AS credito
    FROM public.lancamentos_contabeis_itens i
    JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id
    WHERE l.empresa_representada_id = p_empresa_id
      AND l.data_competencia <= p_data_corte
    GROUP BY i.conta_contabil_id
  ),
  saldos_conta AS (
    SELECT
      pc.id, pc.codigo, pc.nome, pc.tipo, pc.natureza, pc.nivel, pc.conta_pai_id, pc.aceita_lancamento,
      -- Sinal segue o TIPO da conta (convenção do grupo no Balanço/DRE), não
      -- a natureza individual — contas contra (ex.: Depreciação Acumulada,
      -- tipo=ATIVO mas natureza=CREDORA) precisam aparecer negativas aqui
      -- pra REDUZIR o total do grupo, não somar com sinal trocado. `natureza`
      -- continua no retorno só como metadado de exibição (saldo normal
      -- esperado daquela conta específica), não entra nesta conta.
      CASE WHEN pc.tipo IN ('ATIVO', 'DESPESA')
        THEN COALESCE(m.debito, 0) - COALESCE(m.credito, 0)
        ELSE COALESCE(m.credito, 0) - COALESCE(m.debito, 0)
      END AS saldo
    FROM public.plano_contas pc
    LEFT JOIN movimentos m ON m.conta_contabil_id = pc.id
    WHERE pc.empresa_representada_id = p_empresa_id
  ),
  resultado_e_linhas AS (
    SELECT sc.id, sc.codigo, sc.nome, sc.tipo, sc.natureza, sc.nivel, sc.conta_pai_id, sc.aceita_lancamento, sc.saldo
    FROM saldos_conta sc
    WHERE sc.tipo IN ('ATIVO', 'PASSIVO', 'PATRIMONIO')
    UNION ALL
    SELECT
      NULL::uuid, 'RESULTADO'::character varying, 'Resultado do Período (não apurado)'::character varying,
      'PATRIMONIO'::character varying, 'CREDORA'::character varying, 2, v_pl_raiz_id, false,
      COALESCE(SUM(CASE WHEN sc.tipo = 'RECEITA' THEN sc.saldo WHEN sc.tipo = 'DESPESA' THEN -sc.saldo ELSE 0 END), 0)
    FROM saldos_conta sc
    WHERE sc.tipo IN ('RECEITA', 'DESPESA')
  )
  -- UNION ALL sozinho não garante ordem nenhuma — sem isto, telas/exportações
  -- que não re-ordenam por conta própria (CSV/PDF/Excel do detalhe) mostravam
  -- filha antes do pai, uma bagunça real reportada pelo usuário.
  SELECT * FROM resultado_e_linhas ORDER BY codigo;
END;
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_dfc_indireto(p_empresa_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(resultado_periodo numeric, depreciacao_amortizacao numeric, variacao_contas_receber numeric, variacao_contas_pagar numeric, fluxo_operacional numeric, variacao_imobilizado numeric, fluxo_investimento numeric, variacao_patrimonio_liquido numeric, fluxo_financiamento numeric, saldo_caixa_inicial numeric, saldo_caixa_final numeric, variacao_caixa_balanco numeric, variacao_caixa_dfc numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_data_corte_inicial date := p_data_inicio - 1;
  v_conta_caixa uuid;
  v_conta_cr uuid;
  v_conta_cp uuid;
  v_conta_imob uuid;
  v_conta_dep uuid;
  v_caixa_inicial numeric; v_caixa_final numeric;
  v_cr_inicial numeric; v_cr_final numeric;
  v_imob_inicial numeric; v_imob_final numeric;
  v_cp_inicial numeric; v_cp_final numeric;
  v_dep_periodo numeric;
  v_resultado_periodo numeric;
  v_pl_inicial numeric; v_pl_final numeric;
  v_fco numeric; v_fci numeric; v_fcf numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'PERIODO_INVALIDO: data inicial posterior à data final' USING ERRCODE = 'P0001';
  END IF;

  SELECT
    plano_conta_caixa_bancos_default_id, plano_conta_contas_receber_default_id,
    plano_conta_contas_pagar_default_id, plano_conta_imobilizado_default_id,
    plano_conta_despesa_depreciacao_default_id
  INTO v_conta_caixa, v_conta_cr, v_conta_cp, v_conta_imob, v_conta_dep
  FROM public.empresas_representadas WHERE id = p_empresa_id;

  IF v_conta_caixa IS NULL OR v_conta_cr IS NULL OR v_conta_cp IS NULL
     OR v_conta_imob IS NULL OR v_conta_dep IS NULL THEN
    RAISE EXCEPTION 'CONTAS_PADRAO_NAO_CONFIGURADAS: empresa sem plano de contas padrão (caixa/contas a receber/contas a pagar/imobilizado/depreciação) configurado' USING ERRCODE = 'P0001';
  END IF;

  -- Mesma fórmula crédito−débito por conta usada em
  -- relatorio_balanco_patrimonial/relatorio_dmpl. ATIVO inverte sinal
  -- (débito−crédito); PASSIVO/PATRIMONIO/RECEITA ficam crédito−débito
  -- direto; DESPESA também inverte (débito−crédito).
  WITH mov AS (
    SELECT
      i.conta_contabil_id,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE -i.valor END)
        FILTER (WHERE l.data_competencia <= v_data_corte_inicial) AS cd_ate_inicio,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE -i.valor END)
        FILTER (WHERE l.data_competencia BETWEEN p_data_inicio AND p_data_fim) AS cd_periodo
    FROM public.lancamentos_contabeis_itens i
    JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id
    WHERE l.empresa_representada_id = p_empresa_id
      AND l.data_competencia <= p_data_fim
    GROUP BY i.conta_contabil_id
  )
  SELECT
    -COALESCE((SELECT cd_ate_inicio FROM mov WHERE conta_contabil_id = v_conta_caixa), 0),
    -COALESCE((SELECT COALESCE(cd_ate_inicio, 0) + COALESCE(cd_periodo, 0) FROM mov WHERE conta_contabil_id = v_conta_caixa), 0),
    -COALESCE((SELECT cd_ate_inicio FROM mov WHERE conta_contabil_id = v_conta_cr), 0),
    -COALESCE((SELECT COALESCE(cd_ate_inicio, 0) + COALESCE(cd_periodo, 0) FROM mov WHERE conta_contabil_id = v_conta_cr), 0),
    -COALESCE((SELECT cd_ate_inicio FROM mov WHERE conta_contabil_id = v_conta_imob), 0),
    -COALESCE((SELECT COALESCE(cd_ate_inicio, 0) + COALESCE(cd_periodo, 0) FROM mov WHERE conta_contabil_id = v_conta_imob), 0),
    COALESCE((SELECT cd_ate_inicio FROM mov WHERE conta_contabil_id = v_conta_cp), 0),
    COALESCE((SELECT COALESCE(cd_ate_inicio, 0) + COALESCE(cd_periodo, 0) FROM mov WHERE conta_contabil_id = v_conta_cp), 0),
    -- NULL + valor = NULL em SQL — cd_ate_inicio/cd_periodo vêm NULL (não 0)
    -- quando o FILTER não acha nenhuma linha nesse subconjunto (ex.: conta
    -- só teve movimento dentro do período, nada antes). Somar os campos
    -- crus sem COALESCE individual colapsava o resultado inteiro pra NULL,
    -- mascarado como 0 pelo COALESCE externo — bug real achado pela prova
    -- em SQL antes de qualquer teste ao vivo.
    -COALESCE((SELECT cd_periodo FROM mov WHERE conta_contabil_id = v_conta_dep), 0),
    COALESCE((
      SELECT SUM(m.cd_periodo) FROM mov m JOIN public.plano_contas pc ON pc.id = m.conta_contabil_id
      WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo IN ('RECEITA', 'DESPESA')
    ), 0),
    COALESCE((
      SELECT SUM(m.cd_ate_inicio) FROM mov m JOIN public.plano_contas pc ON pc.id = m.conta_contabil_id
      WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo = 'PATRIMONIO'
    ), 0),
    COALESCE((
      SELECT SUM(COALESCE(m.cd_ate_inicio, 0) + COALESCE(m.cd_periodo, 0)) FROM mov m JOIN public.plano_contas pc ON pc.id = m.conta_contabil_id
      WHERE pc.empresa_representada_id = p_empresa_id AND pc.tipo = 'PATRIMONIO'
    ), 0)
  INTO
    v_caixa_inicial, v_caixa_final, v_cr_inicial, v_cr_final, v_imob_inicial, v_imob_final,
    v_cp_inicial, v_cp_final, v_dep_periodo, v_resultado_periodo, v_pl_inicial, v_pl_final;

  v_fco := v_resultado_periodo + v_dep_periodo - (v_cr_final - v_cr_inicial) + (v_cp_final - v_cp_inicial);
  v_fci := -(v_imob_final - v_imob_inicial);
  v_fcf := v_pl_final - v_pl_inicial;

  RETURN QUERY SELECT
    v_resultado_periodo, v_dep_periodo, (v_cr_final - v_cr_inicial), (v_cp_final - v_cp_inicial), v_fco,
    (v_imob_final - v_imob_inicial), v_fci,
    (v_pl_final - v_pl_inicial), v_fcf,
    v_caixa_inicial, v_caixa_final, (v_caixa_final - v_caixa_inicial), (v_fco + v_fci + v_fcf);
END;
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_dmpl(p_empresa_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(conta_id uuid, codigo character varying, nome character varying, nivel integer, conta_pai_id uuid, aceita_lancamento boolean, saldo_inicial numeric, movimento_periodo numeric, saldo_final numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pl_raiz_id uuid;
  v_data_corte_inicial date := p_data_inicio - 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'novus_owner') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_dre(p_empresa_id uuid, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(conta_id uuid, codigo character varying, nome character varying, tipo character varying, natureza character varying, nivel integer, conta_pai_id uuid, aceita_lancamento boolean, valor_periodo numeric)
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
  IF p_data_inicio > p_data_fim THEN
    RAISE EXCEPTION 'PERIODO_INVALIDO: data inicial posterior à data final' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  WITH movimentos AS (
    SELECT
      i.conta_contabil_id,
      SUM(CASE WHEN i.tipo_partida = 'DEBITO' THEN i.valor ELSE 0 END) AS debito,
      SUM(CASE WHEN i.tipo_partida = 'CREDITO' THEN i.valor ELSE 0 END) AS credito
    FROM public.lancamentos_contabeis_itens i
    JOIN public.lancamentos_contabeis l ON l.id = i.lancamento_id
    WHERE l.empresa_representada_id = p_empresa_id
      AND l.data_competencia BETWEEN p_data_inicio AND p_data_fim
    GROUP BY i.conta_contabil_id
  )
  SELECT
    pc.id, pc.codigo, pc.nome, pc.tipo, pc.natureza, pc.nivel, pc.conta_pai_id, pc.aceita_lancamento,
    -- Sinal por TIPO, mesma razão do Balanço (ver comentário lá): DESPESA
    -- cresce a débito, RECEITA cresce a crédito, independente de eventual
    -- conta contra dentro do grupo.
    CASE WHEN pc.tipo = 'DESPESA'
      THEN COALESCE(m.debito, 0) - COALESCE(m.credito, 0)
      ELSE COALESCE(m.credito, 0) - COALESCE(m.debito, 0)
    END AS valor_periodo
  FROM public.plano_contas pc
  LEFT JOIN movimentos m ON m.conta_contabil_id = pc.id
  WHERE pc.empresa_representada_id = p_empresa_id
    AND pc.tipo IN ('RECEITA', 'DESPESA')
  ORDER BY pc.codigo;
END;
$function$;

CREATE OR REPLACE FUNCTION public.relatorio_fluxo_competencia(p_data_ini date, p_data_fim date, p_empresa_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(ano_mes date, receita_prevista numeric, receita_realizada numeric, despesa_prevista numeric, despesa_realizada numeric, saldo_competencia numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  v_admin := public.has_role(auth.uid(), 'novus_owner');

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
$function$;
