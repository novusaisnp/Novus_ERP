-- FIN-0: estorno atomico e idempotente de uma liquidacao especifica.

ALTER TABLE public.liquidacoes_titulos
  ADD COLUMN IF NOT EXISTS estorno_idempotency_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_liquidacoes_titulos_estorno_idempotency
  ON public.liquidacoes_titulos (empresa_representada_id, estorno_idempotency_key)
  WHERE estorno_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.financeiro_estornar_liquidacao(
  p_liquidacao_id uuid,
  p_motivo text,
  p_idempotency_key uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_titulo_id uuid;
  v_tipo_titulo text;
  v_valor_estornado numeric;
  v_valor_original numeric;
  v_valor_restante numeric;
  v_data_restante date;
  v_status_novo text;
  v_ja_estornado boolean;
  v_chave_existente uuid;
  v_movimentacoes_afetadas integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotencia obrigatoria';
  END IF;
  IF length(trim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'Motivo do estorno deve ter ao menos 5 caracteres';
  END IF;

  SELECT empresa_representada_id,
         COALESCE(titulo_id, conta_pagar_id, conta_receber_id),
         COALESCE(tipo_titulo,
           CASE WHEN conta_pagar_id IS NOT NULL THEN 'CONTAS_PAGAR'
                WHEN conta_receber_id IS NOT NULL THEN 'CONTAS_RECEBER' END),
         valor_pago, estornado, estorno_idempotency_key
    INTO v_empresa_id, v_titulo_id, v_tipo_titulo, v_valor_estornado,
         v_ja_estornado, v_chave_existente
    FROM public.liquidacoes_titulos
   WHERE id = p_liquidacao_id
   FOR UPDATE;

  IF v_empresa_id IS NULL OR v_titulo_id IS NULL OR v_tipo_titulo IS NULL THEN
    RAISE EXCEPTION 'Liquidacao nao encontrada ou sem titulo vinculado';
  END IF;
  IF NOT public.user_has_access_to_empresa(v_empresa_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_ja_estornado THEN
    IF v_chave_existente = p_idempotency_key THEN
      RETURN jsonb_build_object(
        'liquidacao_id', p_liquidacao_id,
        'idempotente', true
      );
    END IF;
    RAISE EXCEPTION 'Liquidacao ja estornada';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.movimentacoes_bancarias
     WHERE liquidacao_titulo_id = p_liquidacao_id
       AND conciliado = true
  ) THEN
    RAISE EXCEPTION 'Desfaca a conciliacao bancaria antes do estorno';
  END IF;

  IF v_tipo_titulo = 'CONTAS_RECEBER' THEN
    SELECT valor_original INTO v_valor_original
      FROM public.contas_receber
     WHERE id = v_titulo_id AND empresa_representada_id = v_empresa_id
       AND deleted_at IS NULL
     FOR UPDATE;
  ELSIF v_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT valor_original INTO v_valor_original
      FROM public.contas_pagar
     WHERE id = v_titulo_id AND empresa_representada_id = v_empresa_id
       AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Tipo de titulo invalido na liquidacao';
  END IF;

  IF v_valor_original IS NULL THEN
    RAISE EXCEPTION 'Titulo da liquidacao nao encontrado';
  END IF;

  UPDATE public.liquidacoes_titulos
     SET estornado = true,
         data_estorno = now(),
         motivo_estorno = trim(p_motivo),
         usuario_estorno_id = auth.uid(),
         estorno_idempotency_key = p_idempotency_key
   WHERE id = p_liquidacao_id;

  UPDATE public.movimentacoes_bancarias
     SET estornado = true,
         status = 'ESTORNADO',
         ativo = false,
         data_estorno = now(),
         usuario_estorno_id = auth.uid(),
         motivo_estorno = trim(p_motivo)
   WHERE liquidacao_titulo_id = p_liquidacao_id
     AND estornado = false;
  GET DIAGNOSTICS v_movimentacoes_afetadas = ROW_COUNT;

  SELECT COALESCE(sum(valor_pago), 0), max(data_pagamento)
    INTO v_valor_restante, v_data_restante
    FROM public.liquidacoes_titulos
   WHERE empresa_representada_id = v_empresa_id
     AND COALESCE(estornado, false) = false
     AND COALESCE(cancelada, false) = false
     AND (
       titulo_id = v_titulo_id
       OR (v_tipo_titulo = 'CONTAS_PAGAR' AND conta_pagar_id = v_titulo_id)
       OR (v_tipo_titulo = 'CONTAS_RECEBER' AND conta_receber_id = v_titulo_id)
     );

  IF v_valor_restante > v_valor_original THEN
    RAISE EXCEPTION 'Total liquidado remanescente excede o valor do titulo';
  END IF;
  v_status_novo := CASE
    WHEN v_valor_restante = 0 THEN 'PENDENTE'
    WHEN v_valor_restante < v_valor_original THEN 'PARCIAL'
    WHEN v_tipo_titulo = 'CONTAS_RECEBER' THEN 'RECEBIDO'
    ELSE 'PAGO'
  END;

  IF v_tipo_titulo = 'CONTAS_RECEBER' THEN
    UPDATE public.contas_receber
       SET valor_recebido = v_valor_restante,
           data_recebimento = CASE WHEN v_status_novo = 'RECEBIDO' THEN v_data_restante END,
           status = v_status_novo
     WHERE id = v_titulo_id;
  ELSE
    UPDATE public.contas_pagar
       SET valor_pago = v_valor_restante,
           data_pagamento = CASE WHEN v_status_novo = 'PAGO' THEN v_data_restante END,
           status = v_status_novo
     WHERE id = v_titulo_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, valor_movimentado, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN v_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    v_titulo_id, 'ESTORNO', v_titulo_id, v_tipo_titulo, 'ESTORNO', v_valor_estornado,
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('liquidacao_id', p_liquidacao_id, 'valor_liquidado', v_valor_restante + v_valor_estornado),
    jsonb_build_object('status', v_status_novo, 'valor_liquidado', v_valor_restante,
                       'movimentacoes_estornadas', v_movimentacoes_afetadas),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'liquidacao_id', p_liquidacao_id,
    'idempotente', false,
    'status', v_status_novo,
    'valor_estornado', v_valor_estornado,
    'valor_liquidado_restante', v_valor_restante,
    'movimentacoes_estornadas', v_movimentacoes_afetadas
  );
END;
$$;

REVOKE ALL ON FUNCTION public.financeiro_estornar_liquidacao(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.financeiro_estornar_liquidacao(uuid, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.financeiro_estornar_liquidacao(uuid, text, uuid)
IS 'Estorna uma liquidacao especifica, suas movimentacoes e o saldo do titulo na mesma transacao.';
