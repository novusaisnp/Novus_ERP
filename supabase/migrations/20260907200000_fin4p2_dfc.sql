-- FIN-4 parte 2, fatia 3: DFC (Demonstração do Fluxo de Caixa), método
-- indireto. Fecha a última fatia dos relatórios contábeis essenciais.
--
-- "Reconciliada com o Fluxo de Caixa já existente, não uma segunda
-- implementação divergente" (PLANO_MESTRE): esta RPC não cria NENHUMA
-- lógica de fluxo de caixa nova — deriva inteiramente das mesmas contas
-- contábeis padrão que o resto do FIN-4 já usa (empresas_representadas.
-- plano_conta_*_default_id, mesmas colunas usadas por ATV-1 e pelo
-- reconhecimento automático de título/liquidação). fluxoCaixaService.ts
-- continua sendo a ferramenta de PROJEÇÃO operacional (por vencimento,
-- previsto x realizado) — não é o mesmo tipo de relatório que este DFC
-- contábil formal, então não há lógica pra unificar; o que se reconcilia
-- de fato é a identidade contábil: FCO+FCI+FCF tem que bater com a
-- variação real da conta Caixa e Bancos no razão, no mesmo período —
-- prova matemática embutida na própria função (variacao_caixa_dfc deve
-- ser igual a variacao_caixa_balanco), devolvida pra UI exibir o check.
--
-- Método indireto: parte do Resultado do Período (mesma fórmula de
-- relatorio_dre) e ajusta por itens que não mexem em caixa (depreciação,
-- a mesma conta usada no EBITDA) e pela variação de capital de giro
-- (Contas a Receber/Pagar). Investimento = variação do Imobilizado bruto.
-- Financiamento = variação das contas reais de PATRIMONIO (Capital
-- Social + Lucros Acumulados — a mesma soma que fecha o Balanço na fatia
-- 1, excluída a linha sintética "Resultado do Período", que já entra no
-- operacional).

CREATE OR REPLACE FUNCTION public.relatorio_dfc_indireto(
  p_empresa_id uuid,
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  resultado_periodo numeric,
  depreciacao_amortizacao numeric,
  variacao_contas_receber numeric,
  variacao_contas_pagar numeric,
  fluxo_operacional numeric,
  variacao_imobilizado numeric,
  fluxo_investimento numeric,
  variacao_patrimonio_liquido numeric,
  fluxo_financiamento numeric,
  saldo_caixa_inicial numeric,
  saldo_caixa_final numeric,
  variacao_caixa_balanco numeric,
  variacao_caixa_dfc numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$$;

REVOKE EXECUTE ON FUNCTION public.relatorio_dfc_indireto(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_dfc_indireto(uuid, date, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.relatorio_dfc_indireto(uuid, date, date) IS
  'FIN-4 parte 2 (fatia 3): DFC método indireto, derivado 100% do razão via as mesmas contas padrão de empresas_representadas usadas por ATV-1/reconhecimento automático de título. variacao_caixa_dfc (FCO+FCI+FCF) deve bater com variacao_caixa_balanco (saldo real da conta Caixa e Bancos) — prova de fechamento embutida.';
