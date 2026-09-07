-- FIN-4 parte 2, fatia 1: Balanço Patrimonial + DRE (EBITDA é derivado no
-- cliente a partir da DRE + da conta de despesa de depreciação já
-- configurada por empresa em ATV-1 — nenhuma lógica nova de depreciação
-- aqui). Ambos são funções de LEITURA puras sobre o razão que já existe
-- (lancamentos_contabeis/lancamentos_contabeis_itens/plano_contas) — nenhuma
-- tabela nova, nenhum lançamento novo.
--
-- Mesmo padrão de segurança de fn_fluxo_caixa_resumo (FIN-1/Fase 5):
-- SECURITY DEFINER com checagem explícita de acesso à empresa, não confia
-- em RLS sozinha, porque a função agrega dado de várias tabelas.
--
-- DMPL e DFC ficam para as próximas fatias (fatia 2 e 3), combinado com o
-- usuário antes de começar esta.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Balanço Patrimonial — saldo acumulado por conta ATIVO/PASSIVO/PATRIMONIO
--    até uma data de corte, mais uma linha sintética de "Resultado do
--    Período (não apurado)" para o balanço fechar (Ativo = Passivo + PL),
--    já que não existe ainda lançamento de encerramento formal zerando
--    RECEITA/DESPESA em Lucros/Prejuízos Acumulados (períodos_contabeis
--    ainda não tem fechamento formal construído).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_balanco_patrimonial(
  p_empresa_id uuid,
  p_data_corte date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  conta_id uuid,
  codigo character varying,
  nome character varying,
  tipo character varying,
  natureza character varying,
  nivel integer,
  conta_pai_id uuid,
  aceita_lancamento boolean,
  saldo numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pl_raiz_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
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
$$;

REVOKE EXECUTE ON FUNCTION public.relatorio_balanco_patrimonial(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_balanco_patrimonial(uuid, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.relatorio_balanco_patrimonial(uuid, date) IS
  'FIN-4 parte 2: Balanço Patrimonial derivado do razão (lancamentos_contabeis). Inclui linha sintética "Resultado do Período (não apurado)" para fechar Ativo = Passivo + PL, pois ainda não há encerramento formal de período movendo RECEITA/DESPESA para Lucros Acumulados.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. DRE — movimento por conta RECEITA/DESPESA dentro de um intervalo de
--    competência (o "período" do relatório, não acumulado desde o início).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.relatorio_dre(
  p_empresa_id uuid,
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE (
  conta_id uuid,
  codigo character varying,
  nome character varying,
  tipo character varying,
  natureza character varying,
  nivel integer,
  conta_pai_id uuid,
  aceita_lancamento boolean,
  valor_periodo numeric
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
$$;

REVOKE EXECUTE ON FUNCTION public.relatorio_dre(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relatorio_dre(uuid, date, date) TO authenticated, service_role;
COMMENT ON FUNCTION public.relatorio_dre(uuid, date, date) IS
  'FIN-4 parte 2: DRE (movimento de RECEITA/DESPESA por conta) para um intervalo de competência. EBITDA é derivado no cliente somando de volta o valor da conta empresas_representadas.plano_conta_despesa_depreciacao_default_id (ATV-1) ao resultado.';
