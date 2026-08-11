-- FIN-0: cancelamento atomico e idempotente de titulo sem liquidacao.

ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS cancelamento_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS data_cancelamento timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_cancelamento_id uuid;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS cancelamento_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS data_cancelamento timestamptz,
  ADD COLUMN IF NOT EXISTS usuario_cancelamento_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_pagar_cancelamento_idempotency
  ON public.contas_pagar (empresa_representada_id, cancelamento_idempotency_key)
  WHERE cancelamento_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_contas_receber_cancelamento_idempotency
  ON public.contas_receber (empresa_representada_id, cancelamento_idempotency_key)
  WHERE cancelamento_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.financeiro_cancelar_titulo(
  p_titulo_id uuid,
  p_tipo_titulo text,
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
  v_status text;
  v_valor_liquidado numeric;
  v_chave_existente uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Chave de idempotencia obrigatoria';
  END IF;
  IF length(trim(COALESCE(p_motivo, ''))) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento deve ter ao menos 5 caracteres';
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    SELECT empresa_representada_id, status, COALESCE(valor_pago, 0), cancelamento_idempotency_key
      INTO v_empresa_id, v_status, v_valor_liquidado, v_chave_existente
      FROM public.contas_pagar
     WHERE id = p_titulo_id AND deleted_at IS NULL
     FOR UPDATE;
  ELSE
    SELECT empresa_representada_id, status, COALESCE(valor_recebido, 0), cancelamento_idempotency_key
      INTO v_empresa_id, v_status, v_valor_liquidado, v_chave_existente
      FROM public.contas_receber
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
  IF v_status = 'CANCELADO' THEN
    IF v_chave_existente = p_idempotency_key THEN
      RETURN jsonb_build_object('titulo_id', p_titulo_id, 'idempotente', true);
    END IF;
    RAISE EXCEPTION 'Titulo ja cancelado';
  END IF;
  IF v_valor_liquidado > 0 OR EXISTS (
    SELECT 1
      FROM public.liquidacoes_titulos
     WHERE empresa_representada_id = v_empresa_id
       AND COALESCE(estornado, false) = false
       AND COALESCE(cancelada, false) = false
       AND (
         titulo_id = p_titulo_id
         OR (p_tipo_titulo = 'CONTAS_PAGAR' AND conta_pagar_id = p_titulo_id)
         OR (p_tipo_titulo = 'CONTAS_RECEBER' AND conta_receber_id = p_titulo_id)
       )
  ) THEN
    RAISE EXCEPTION 'Estorne todas as liquidacoes antes de cancelar o titulo';
  END IF;

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    UPDATE public.contas_pagar
       SET status = 'CANCELADO',
           motivo_cancelamento = trim(p_motivo),
           data_cancelamento = now(),
           usuario_cancelamento_id = auth.uid(),
           cancelamento_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  ELSE
    UPDATE public.contas_receber
       SET status = 'CANCELADO',
           motivo_cancelamento = trim(p_motivo),
           data_cancelamento = now(),
           usuario_cancelamento_id = auth.uid(),
           cancelamento_idempotency_key = p_idempotency_key
     WHERE id = p_titulo_id;
  END IF;

  INSERT INTO public.historico_movimentacoes_financeiras (
    empresa_representada_id, tabela_origem, registro_id, acao, titulo_id,
    tipo_titulo, tipo_operacao, usuario_id, usuario_nome,
    dados_anteriores, dados_novos, observacoes
  ) VALUES (
    v_empresa_id,
    CASE WHEN p_tipo_titulo = 'CONTAS_PAGAR' THEN 'contas_pagar' ELSE 'contas_receber' END,
    p_titulo_id, 'CANCELAMENTO', p_titulo_id, p_tipo_titulo, 'CANCELAMENTO',
    auth.uid(), auth.jwt()->>'email',
    jsonb_build_object('status', v_status),
    jsonb_build_object('status', 'CANCELADO'),
    trim(p_motivo)
  );

  RETURN jsonb_build_object(
    'titulo_id', p_titulo_id,
    'idempotente', false,
    'status', 'CANCELADO'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.financeiro_cancelar_titulo(uuid, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.financeiro_cancelar_titulo(uuid, text, text, uuid) TO authenticated;

COMMENT ON FUNCTION public.financeiro_cancelar_titulo(uuid, text, text, uuid)
IS 'Cancela titulo sem liquidacao e registra historico na mesma transacao.';
