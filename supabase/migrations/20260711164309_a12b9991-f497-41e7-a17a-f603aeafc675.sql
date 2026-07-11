
-- =========================================================================
-- LOTE S4-B: REVOKE anon SELECT em tabelas sensíveis
-- =========================================================================
REVOKE SELECT ON public.folha_pagamento FROM anon;
REVOKE SELECT ON public.colaboradores FROM anon;
REVOKE SELECT ON public.contas_pagar FROM anon;
REVOKE SELECT ON public.contas_receber FROM anon;
REVOKE SELECT ON public.movimentacoes_bancarias FROM anon;
REVOKE SELECT ON public.vendas FROM anon;
REVOKE SELECT ON public.venda_pagamento FROM anon;
REVOKE SELECT ON public.venda_pagamento_parcelas FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;

-- =========================================================================
-- LOTE S4-C: REVOKE PUBLIC EXECUTE + GRANT authenticated nas SECURITY DEFINER
-- =========================================================================
-- RPC-callable (chamáveis do cliente)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_has_access_to_empresa(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_has_access_to_empresa(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_audit_trail(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_audit_trail(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.resolver_classificacao_receita(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resolver_classificacao_receita(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.converter_orcamento_em_venda(jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.converter_orcamento_em_venda(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.gerar_contas_receber_da_venda(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.transferencia_bancaria_atomica(uuid, uuid, uuid, numeric, date, text, text, uuid, uuid, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.transferencia_bancaria_atomica(uuid, uuid, uuid, numeric, date, text, text, uuid, uuid, uuid) TO authenticated;

-- Trigger-only (não devem ser chamáveis diretamente)
REVOKE EXECUTE ON FUNCTION public.atualizar_saldo_conta_movimentacao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bloquear_edicao_orcamento_convertido() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_perfis_sistema() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_historico_movimentacao() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_classificacao_venda() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validar_classificacao_categoria() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validar_transferencia_movimentacao() FROM PUBLIC;

-- =========================================================================
-- LOTE FIN-D0: regra à vista server-side (MODALIDADE_A_VISTA_COM_PRAZO)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validar_pagamento_venda(p_venda_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_venda           record;
  v_empresa_atual   uuid;
  v_is_admin        boolean;
  v_erros           jsonb := '[]'::jsonb;
  v_avisos          jsonb := '[]'::jsonb;
  v_soma_pag        numeric(15,2);
  v_tolerancia      numeric(6,3) := 0.02;
  v_politica        record;
  v_credi_natureza  uuid;
  v_lp              record;
  v_soma_parc       numeric(15,2);
  v_qtd_parc        integer;
  v_vencto_ant      date;
  v_parc            record;
  v_mono_ok         boolean;
  v_data_ref        date;
  v_max_venc        date;
BEGIN
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erros', jsonb_build_array(jsonb_build_object(
        'codigo','VENDA_NAO_ENCONTRADA','categoria','TENANT','mensagem','Venda não encontrada'
      )),
      'avisos', '[]'::jsonb
    );
  END IF;

  v_empresa_atual := public.get_user_empresa_id();
  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF NOT v_is_admin AND (v_empresa_atual IS NULL OR v_empresa_atual <> v_venda.empresa_representada_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'erros', jsonb_build_array(jsonb_build_object(
        'codigo','PERM_DENIED','categoria','PERMISSAO','mensagem','Sem permissão para validar esta venda'
      )),
      'avisos', '[]'::jsonb
    );
  END IF;

  SELECT COALESCE(SUM(valor_liquido),0) INTO v_soma_pag
  FROM public.venda_pagamento
  WHERE venda_id = p_venda_id AND deleted_at IS NULL;

  IF abs(v_soma_pag - v_venda.valor_total) > v_tolerancia THEN
    v_erros := v_erros || jsonb_build_object(
      'codigo','DIVERGENCIA_TOTAL','categoria','TOTAL',
      'mensagem', format('Soma de pagamentos (%s) difere do total da venda (%s)', v_soma_pag, v_venda.valor_total),
      'campo','valor_liquido'
    );
  END IF;

  SELECT * INTO v_politica FROM public.cliente_politica_pagamento
  WHERE cliente_id = v_venda.cliente_id AND deleted_at IS NULL;

  IF FOUND AND v_politica.status = 'BLOQUEADO' THEN
    v_erros := v_erros || jsonb_build_object(
      'codigo','CLIENTE_BLOQUEADO','categoria','POLITICA',
      'mensagem', COALESCE(v_politica.motivo_bloqueio,'Cliente bloqueado para vendas')
    );
  END IF;

  SELECT id INTO v_credi_natureza FROM public.naturezas_pagamento
  WHERE codigo = 'CREDIARIO_PROPRIO' AND deleted_at IS NULL LIMIT 1;

  v_data_ref := COALESCE(v_venda.data_venda, CURRENT_DATE);

  FOR v_lp IN
    SELECT vp.*, m.permite_parcelamento, m.liquidacao_imediata, m.codigo AS modalidade_codigo, m.nome AS modalidade_nome
    FROM public.venda_pagamento vp
    JOIN public.modalidades_pagamento m ON m.id = vp.modalidade_id
    WHERE vp.venda_id = p_venda_id AND vp.deleted_at IS NULL
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.cliente_modalidades_bloqueadas b
      WHERE b.cliente_id = v_venda.cliente_id AND b.modalidade_id = v_lp.modalidade_id
    ) THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','MODALIDADE_BLOQUEADA','categoria','MODALIDADE',
        'mensagem', format('Modalidade %s bloqueada para este cliente', v_lp.modalidade_nome),
        'campo','modalidade_id'
      );
    END IF;

    IF v_credi_natureza IS NOT NULL AND v_lp.natureza_id = v_credi_natureza THEN
      IF NOT FOUND OR v_politica IS NULL OR NOT v_politica.permite_crediario THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','CREDIARIO_SEM_LIMITE','categoria','POLITICA',
          'mensagem','Cliente não possui crediário habilitado'
        );
      ELSIF v_lp.valor_liquido > (v_politica.limite_crediario - v_politica.limite_utilizado) THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','CREDIARIO_SEM_LIMITE','categoria','POLITICA',
          'mensagem', format('Valor %s excede limite disponível %s',
            v_lp.valor_liquido, (v_politica.limite_crediario - v_politica.limite_utilizado))
        );
      END IF;
    END IF;

    IF NOT v_lp.permite_parcelamento AND v_lp.qtd_parcelas > 1 THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','MODALIDADE_SEM_PARCELAMENTO','categoria','MODALIDADE',
        'mensagem', format('Modalidade %s não permite parcelamento', v_lp.modalidade_nome),
        'campo','qtd_parcelas'
      );
    END IF;

    -- FIN-D0: modalidade à vista com prazo é proibido
    IF COALESCE(v_lp.liquidacao_imediata, false) THEN
      SELECT MAX(data_vencimento) INTO v_max_venc
        FROM public.venda_pagamento_parcelas
        WHERE venda_pagamento_id = v_lp.id;

      IF v_lp.qtd_parcelas > 1
         OR (v_max_venc IS NOT NULL AND v_max_venc > v_data_ref) THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','MODALIDADE_A_VISTA_COM_PRAZO','categoria','MODALIDADE',
          'mensagem', format('Modalidade %s é à vista e não admite parcelamento ou vencimento futuro', v_lp.modalidade_nome),
          'campo','qtd_parcelas'
        );
      END IF;
    END IF;

    IF v_lp.plano_pagamento_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.planos_pagamento pp
        WHERE pp.id = v_lp.plano_pagamento_id AND pp.deleted_at IS NULL AND pp.ativo = true
          AND (pp.vigencia_inicio IS NULL OR pp.vigencia_inicio <= CURRENT_DATE)
          AND (pp.vigencia_fim IS NULL OR pp.vigencia_fim >= CURRENT_DATE)
      ) THEN
        v_erros := v_erros || jsonb_build_object(
          'codigo','PLANO_INATIVO_OU_EXPIRADO','categoria','PLANO',
          'mensagem','Plano de pagamento inativo ou fora da vigência',
          'campo','plano_pagamento_id'
        );
      END IF;
    END IF;

    SELECT COALESCE(SUM(valor),0), COUNT(*) INTO v_soma_parc, v_qtd_parc
    FROM public.venda_pagamento_parcelas
    WHERE venda_pagamento_id = v_lp.id;

    IF v_qtd_parc <> v_lp.qtd_parcelas THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','PARCELAS_QTD','categoria','PARCELA',
        'mensagem', format('Quantidade de parcelas (%s) diferente do informado (%s)', v_qtd_parc, v_lp.qtd_parcelas),
        'campo','qtd_parcelas'
      );
    END IF;

    IF abs(v_soma_parc - v_lp.valor_liquido) > v_tolerancia THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','DIVERGENCIA_PARCELAS','categoria','PARCELA',
        'mensagem', format('Soma das parcelas (%s) difere do valor da linha (%s)', v_soma_parc, v_lp.valor_liquido)
      );
    END IF;

    v_vencto_ant := NULL;
    v_mono_ok := true;
    FOR v_parc IN
      SELECT * FROM public.venda_pagamento_parcelas
      WHERE venda_pagamento_id = v_lp.id
      ORDER BY numero
    LOOP
      IF v_vencto_ant IS NOT NULL AND v_parc.data_vencimento < v_vencto_ant THEN
        v_mono_ok := false;
      END IF;
      v_vencto_ant := v_parc.data_vencimento;
    END LOOP;
    IF NOT v_mono_ok THEN
      v_erros := v_erros || jsonb_build_object(
        'codigo','VENCIMENTO_NAO_MONOTONICO','categoria','PARCELA',
        'mensagem','Datas de vencimento das parcelas não são monotônicas'
      );
    END IF;
  END LOOP;

  IF v_politica IS NOT NULL AND v_politica.status = 'EM_ANALISE' THEN
    v_avisos := v_avisos || jsonb_build_object(
      'codigo','CLIENTE_EM_ANALISE','mensagem','Cliente em análise financeira'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', jsonb_array_length(v_erros) = 0,
    'erros', v_erros,
    'avisos', v_avisos
  );
END;
$function$;

-- reafirmar grants após CREATE OR REPLACE
REVOKE EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.validar_pagamento_venda(uuid) TO authenticated;
