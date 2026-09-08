-- FIN-1: liquidação de título ganha a opção de vincular uma movimentação
-- bancária JÁ EXISTENTE (em vez de sempre criar uma nova), evitando lançamento
-- duplicado quando o movimento no banco já foi registrado antes (ex.: import
-- de extrato ainda não conciliado, ou lançamento manual feito em Gestão
-- Bancária). Reaproveita 100% o guard de estorno já existente
-- ("Desfaca a conciliacao bancaria antes do estorno" em
-- financeiro_estornar_liquidacao), que hoje só é alcançável pelo fluxo de
-- conciliação de extrato — nenhuma mudança necessária lá, ele já opera de
-- forma genérica sobre `liquidacao_titulo_id`, não importa como foi setado.
--
-- CREATE OR REPLACE (sem DROP) propositalmente: Postgres permite acrescentar
-- parâmetro novo com DEFAULT no final da lista sem quebrar a identidade da
-- função, preservando o ACL atual (authenticated/service_role já tinham
-- EXECUTE) sem precisar regravar GRANT.

CREATE OR REPLACE FUNCTION public.financeiro_liquidar_titulo(p_titulo_id uuid, p_tipo_titulo text, p_valor numeric, p_data_pagamento date, p_forma_pagamento text, p_idempotency_key uuid, p_conta_bancaria_id uuid DEFAULT NULL::uuid, p_observacoes text DEFAULT NULL::text, p_multi_baixa jsonb DEFAULT '[]'::jsonb, p_ticket_autorizacao uuid DEFAULT NULL::uuid, p_juros numeric DEFAULT 0, p_multa numeric DEFAULT 0, p_desconto numeric DEFAULT 0, p_movimentacao_bancaria_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_empresa_id uuid;
  v_liquidacao_id uuid;
  v_movimentacao_id uuid;
  v_valor_original numeric;
  v_valor_anterior numeric;
  v_valor_total numeric;
  v_saldo_anterior numeric;
  v_saldo_posterior numeric;
  v_status_atual text;
  v_status_novo text;
  v_descricao text;
  v_numero_documento text;
  v_natureza_id uuid;
  v_plano_conta_id uuid;
  v_centro_custo_id uuid;
  v_tipo_movimentacao text;
  v_baixa jsonb;
  v_baixa_conta_id uuid;
  v_baixa_valor numeric;
  v_soma_multibaixa numeric := 0;
  v_valor_efetivo numeric;
  v_mov_existente_conta_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  PERFORM financeiro_exigir_permissao('financeiro.liquidar');

  -- Lookup preliminar só pra resolver a empresa antes da checagem
  -- retroativa (o SELECT completo mais abaixo repete isso, sem problema).
  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT empresa_representada_id INTO v_empresa_id FROM public.contas_receber WHERE id = p_titulo_id AND deleted_at IS NULL;
  ELSE
    SELECT empresa_representada_id INTO v_empresa_id FROM public.contas_pagar WHERE id = p_titulo_id AND deleted_at IS NULL;
  END IF;

  IF v_empresa_id IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'novus_owner')
              OR public.has_permissao(auth.uid(), 'financeiro.lancamentoRetroativo'))
  THEN
    DECLARE
      v_limite numeric;
    BEGIN
      SELECT limite_lancamento_retroativo_horas INTO v_limite
        FROM public.empresas_representadas WHERE id = v_empresa_id;
      IF v_limite IS NOT NULL
         AND public.horas_uteis_decorridas(p_data_pagamento::timestamptz, now()) > v_limite THEN
        PERFORM financeiro_exigir_autorizacao_titulo(
          p_ticket_autorizacao, 'LIQUIDACAO_RETROATIVA', p_tipo_titulo, p_titulo_id);
      END IF;
    END;
  END IF;

  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
  -- Determinado cedo (não depende de nenhum outro cálculo): usado tanto na
  -- validação de vínculo de movimentação existente quanto, mais abaixo, na
  -- criação de uma nova (reatribuição redundante lá, mantida como estava).
  v_tipo_movimentacao := CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN 'DEPOSITO' ELSE 'SAQUE' END;
  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor da liquidacao deve ser maior que zero';
  END IF;
  IF p_data_pagamento IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Data e chave de idempotencia sao obrigatorias';
  END IF;
  IF jsonb_typeof(COALESCE(p_multi_baixa, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Divisao da baixa deve ser uma lista';
  END IF;

  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT empresa_representada_id, valor_original, COALESCE(valor_recebido, 0), status,
           descricao, numero_documento, natureza_id, plano_conta_id, centro_custo_id
      INTO v_empresa_id, v_valor_original, v_valor_anterior, v_status_atual,
           v_descricao, v_numero_documento, v_natureza_id, v_plano_conta_id, v_centro_custo_id
      FROM public.contas_receber
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    SELECT empresa_representada_id, valor_original, COALESCE(valor_pago, 0), status,
           descricao, numero_documento, natureza_id, plano_conta_id, centro_custo_id
      INTO v_empresa_id, v_valor_original, v_valor_anterior, v_status_atual,
           v_descricao, v_numero_documento, v_natureza_id, v_plano_conta_id, v_centro_custo_id
      FROM public.contas_pagar
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  END IF;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Titulo nao encontrado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_liquidacao_id
    FROM public.liquidacoes_titulos
   WHERE empresa_representada_id = v_empresa_id
     AND idempotency_key = p_idempotency_key;
  IF v_liquidacao_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'liquidacao_id', v_liquidacao_id, 'idempotente', true,
      'status', v_status_atual,
      'saldo_posterior', GREATEST(v_valor_original - v_valor_anterior, 0)
    );
  END IF;

  IF v_status_atual = 'CANCELADO' THEN
    RAISE EXCEPTION 'Titulo cancelado nao pode ser liquidado';
  END IF;

  v_saldo_anterior := GREATEST(v_valor_original - v_valor_anterior, 0);
  IF v_saldo_anterior = 0 THEN
    RAISE EXCEPTION 'Titulo ja liquidado';
  END IF;
  IF p_valor > v_saldo_anterior THEN
    RAISE EXCEPTION 'Valor informado excede o saldo do titulo';
  END IF;

  IF COALESCE(p_juros, 0) < 0 OR COALESCE(p_multa, 0) < 0 OR COALESCE(p_desconto, 0) < 0 THEN
    RAISE EXCEPTION 'Juros, multa e desconto nao podem ser negativos';
  END IF;

  -- O principal (p_valor) abate o saldo do titulo; juros e multa acrescem e desconto
  -- abate o que de fato circula no banco. Titulo de 100 pago com 10 de juros fica
  -- quitado, e 110 entram no caixa.
  v_valor_efetivo := p_valor + COALESCE(p_juros, 0) + COALESCE(p_multa, 0) - COALESCE(p_desconto, 0);
  IF v_valor_efetivo < 0 THEN
    RAISE EXCEPTION 'Desconto maior que o valor da baixa com acrescimos';
  END IF;

  v_valor_total := v_valor_anterior + p_valor;
  v_saldo_posterior := v_valor_original - v_valor_total;
  v_status_novo := CASE
    WHEN v_saldo_posterior = 0 AND p_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    WHEN v_saldo_posterior = 0 THEN 'PAGO'
    ELSE 'PARCIAL'
  END;

  IF p_movimentacao_bancaria_id IS NOT NULL THEN
    IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 OR p_conta_bancaria_id IS NOT NULL THEN
      RAISE EXCEPTION 'Vincular uma movimentacao existente nao pode ser combinado com divisao entre contas ou conta bancaria para nova movimentacao';
    END IF;
    SELECT conta_bancaria_id INTO v_mov_existente_conta_id
      FROM public.movimentacoes_bancarias
     WHERE id = p_movimentacao_bancaria_id
       AND empresa_representada_id = v_empresa_id
       AND ativo = true
       AND estornado = false
       AND liquidacao_titulo_id IS NULL
       AND tipo_movimentacao = v_tipo_movimentacao
       AND round(valor, 2) = round(v_valor_efetivo, 2)
     FOR UPDATE;
    IF v_mov_existente_conta_id IS NULL THEN
      RAISE EXCEPTION 'Movimentacao bancaria indisponivel para vinculo: nao encontrada, ja vinculada a outro titulo, estornada, ou valor/tipo nao corresponde (esperado % de %)',
        v_tipo_movimentacao, v_valor_efetivo;
    END IF;
  ELSIF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
    FOR v_baixa IN SELECT value FROM jsonb_array_elements(p_multi_baixa)
    LOOP
      v_baixa_conta_id := NULLIF(v_baixa->>'conta_bancaria_id', '')::uuid;
      v_baixa_valor := NULLIF(v_baixa->>'valor', '')::numeric;
      IF v_baixa_conta_id IS NULL OR v_baixa_valor IS NULL OR v_baixa_valor <= 0 THEN
        RAISE EXCEPTION 'Conta e valor positivo sao obrigatorios em cada divisao';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.contas_bancarias
         WHERE id = v_baixa_conta_id AND empresa_representada_id = v_empresa_id
           AND deleted_at IS NULL AND ativo = true
      ) THEN
        RAISE EXCEPTION 'Conta bancaria invalida para a empresa';
      END IF;
      v_soma_multibaixa := v_soma_multibaixa + v_baixa_valor;
    END LOOP;
    IF v_soma_multibaixa <> v_valor_efetivo THEN
      RAISE EXCEPTION 'Soma da divisao difere do valor da liquidacao';
    END IF;
  ELSIF p_conta_bancaria_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.contas_bancarias
       WHERE id = p_conta_bancaria_id AND empresa_representada_id = v_empresa_id
         AND deleted_at IS NULL AND ativo = true
    ) THEN
      RAISE EXCEPTION 'Conta bancaria invalida para a empresa';
    END IF;
  ELSIF p_forma_pagamento <> 'DINHEIRO' THEN
    RAISE EXCEPTION 'Conta bancaria obrigatoria para esta forma de pagamento';
  END IF;

  INSERT INTO public.liquidacoes_titulos (
    empresa_representada_id, conta_pagar_id, conta_receber_id, titulo_id, tipo_titulo,
    data_liquidacao, data_pagamento, valor_pago, valor_original_titulo, forma_pagamento,
    conta_bancaria_id, observacoes, usuario_liquidacao_id, idempotency_key,
    valor_juros, valor_multa, valor_desconto
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN p_titulo_id END,
    CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN p_titulo_id END,
    p_titulo_id, p_tipo_titulo, p_data_pagamento, p_data_pagamento, p_valor,
    v_valor_original, p_forma_pagamento, COALESCE(p_conta_bancaria_id, v_mov_existente_conta_id), p_observacoes,
    auth.uid(), p_idempotency_key,
    COALESCE(p_juros, 0), COALESCE(p_multa, 0), COALESCE(p_desconto, 0)
  ) RETURNING id INTO v_liquidacao_id;

  IF p_tipo_titulo = 'CONTAS_RECEBER' THEN
    UPDATE public.contas_receber
       SET valor_recebido = v_valor_total,
           data_recebimento = CASE WHEN v_status_novo = 'RECEBIDO' THEN p_data_pagamento ELSE NULL END,
           status = v_status_novo
     WHERE id = p_titulo_id;
    v_tipo_movimentacao := 'DEPOSITO';
  ELSE
    UPDATE public.contas_pagar
       SET valor_pago = v_valor_total,
           data_pagamento = CASE WHEN v_status_novo = 'PAGO' THEN p_data_pagamento ELSE NULL END,
           status = v_status_novo
     WHERE id = p_titulo_id;
    v_tipo_movimentacao := 'SAQUE';
  END IF;

  IF p_movimentacao_bancaria_id IS NOT NULL THEN
    UPDATE public.movimentacoes_bancarias
       SET liquidacao_titulo_id = v_liquidacao_id
     WHERE id = p_movimentacao_bancaria_id
     RETURNING id INTO v_movimentacao_id;
  ELSIF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
    FOR v_baixa IN SELECT value FROM jsonb_array_elements(p_multi_baixa)
    LOOP
      v_baixa_conta_id := (v_baixa->>'conta_bancaria_id')::uuid;
      v_baixa_valor := (v_baixa->>'valor')::numeric;
      INSERT INTO public.liquidacoes_multiplas (
        empresa_representada_id, data_liquidacao, forma_pagamento, valor_total,
        liquidacao_principal_id, conta_bancaria_id, valor, observacoes
      ) VALUES (
        v_empresa_id, p_data_pagamento, p_forma_pagamento, v_baixa_valor,
        v_liquidacao_id, v_baixa_conta_id, v_baixa_valor, v_baixa->>'observacoes'
      );

      INSERT INTO public.movimentacoes_bancarias (
        empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor,
        data_lancamento, data_movimentacao, descricao, numero_documento, documento_referencia,
        status, natureza_id, plano_conta_id, centro_custo_id, created_by,
        usuario_criacao_id, liquidacao_titulo_id
      ) VALUES (
        v_empresa_id, v_baixa_conta_id, v_tipo_movimentacao, v_tipo_movimentacao, v_baixa_valor,
        p_data_pagamento, p_data_pagamento, 'Liquidacao: ' || v_descricao,
        v_numero_documento, v_numero_documento, 'EFETIVADO', v_natureza_id,
        v_plano_conta_id, v_centro_custo_id, auth.uid(), auth.uid(), v_liquidacao_id
      );
    END LOOP;
  ELSIF p_conta_bancaria_id IS NOT NULL THEN
    INSERT INTO public.movimentacoes_bancarias (
      empresa_representada_id, conta_bancaria_id, tipo, tipo_movimentacao, valor,
      data_lancamento, data_movimentacao, descricao, numero_documento, documento_referencia,
      status, natureza_id, plano_conta_id, centro_custo_id, created_by,
      usuario_criacao_id, liquidacao_titulo_id
    ) VALUES (
      v_empresa_id, p_conta_bancaria_id, v_tipo_movimentacao, v_tipo_movimentacao, v_valor_efetivo,
      p_data_pagamento, p_data_pagamento, 'Liquidacao: ' || v_descricao,
      v_numero_documento, v_numero_documento, 'EFETIVADO', v_natureza_id,
      v_plano_conta_id, v_centro_custo_id, auth.uid(), auth.uid(), v_liquidacao_id
    ) RETURNING id INTO v_movimentacao_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, valor_movimentado, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    p_titulo_id, 'LIQUIDACAO', p_titulo_id, p_tipo_titulo, 'LIQUIDACAO', p_valor,
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('status', v_status_atual, 'valor_liquidado', v_valor_anterior),
    jsonb_build_object('status', v_status_novo, 'valor_liquidado', v_valor_total,
                       'liquidacao_id', v_liquidacao_id, 'movimentacao_id', v_movimentacao_id),
    p_observacoes
  );

  RETURN jsonb_build_object(
    'liquidacao_id', v_liquidacao_id, 'movimentacao_id', v_movimentacao_id,
    'idempotente', false, 'status', v_status_novo, 'saldo_posterior', v_saldo_posterior,
    'valor_efetivo', v_valor_efetivo
  );
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'financeiro_liquidar_titulo'
      AND p.pronargs = 14
  ) THEN
    RAISE EXCEPTION 'financeiro_liquidar_titulo nao ganhou o parametro novo (esperado 14 argumentos)';
  END IF;
END $$;
