-- FIN-0: baixa de titulo atomica, parcial e idempotente.
-- Migration aditiva: leitores e escritores anteriores continuam compativeis.

ALTER TABLE public.liquidacoes_titulos
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS liquidacao_titulo_id uuid
    REFERENCES public.liquidacoes_titulos(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_liquidacoes_titulos_idempotency
  ON public.liquidacoes_titulos (empresa_representada_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_bancarias_liquidacao
  ON public.movimentacoes_bancarias (liquidacao_titulo_id)
  WHERE liquidacao_titulo_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.financeiro_liquidar_titulo(
  p_titulo_id uuid,
  p_tipo_titulo text,
  p_valor numeric,
  p_data_pagamento date,
  p_forma_pagamento text,
  p_idempotency_key uuid,
  p_conta_bancaria_id uuid DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_multi_baixa jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
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

  v_valor_total := v_valor_anterior + p_valor;
  v_saldo_posterior := v_valor_original - v_valor_total;
  v_status_novo := CASE
    WHEN v_saldo_posterior = 0 AND p_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    WHEN v_saldo_posterior = 0 THEN 'PAGO'
    ELSE 'PARCIAL'
  END;

  IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
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
    IF v_soma_multibaixa <> p_valor THEN
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
    conta_bancaria_id, observacoes, usuario_liquidacao_id, idempotency_key
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN p_titulo_id END,
    CASE WHEN p_tipo_titulo = 'CONTAS_RECEBER' THEN p_titulo_id END,
    p_titulo_id, p_tipo_titulo, p_data_pagamento, p_data_pagamento, p_valor,
    v_valor_original, p_forma_pagamento, p_conta_bancaria_id, p_observacoes,
    auth.uid(), p_idempotency_key
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

  IF jsonb_array_length(COALESCE(p_multi_baixa, '[]'::jsonb)) > 0 THEN
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
      v_empresa_id, p_conta_bancaria_id, v_tipo_movimentacao, v_tipo_movimentacao, p_valor,
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
    'idempotente', false, 'status', v_status_novo, 'saldo_posterior', v_saldo_posterior
  );
END;
$$;

REVOKE ALL ON FUNCTION public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb
) IS 'Liquida titulo com bloqueio, baixa parcial, idempotencia, movimentacao bancaria e auditoria na mesma transacao.';
