CREATE OR REPLACE FUNCTION public.enfileirar_webhook_titulo_liquidado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo public.contas_receber%ROWTYPE;
  v_evento text;
  v_correlacao text;
BEGIN
  -- Porta 2 devolve ao satélite somente recebimentos; contas a pagar não têm
  -- consumidor no contrato atual.
  IF NEW.tipo_titulo <> 'CONTAS_RECEBER' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_titulo
  FROM public.contas_receber
  WHERE id = NEW.titulo_id
    AND empresa_representada_id = NEW.empresa_representada_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_evento := CASE
    WHEN COALESCE(v_titulo.valor_recebido, 0) + NEW.valor_pago >= v_titulo.valor_original
      THEN 'receivable.paid'
    ELSE 'receivable.partially_paid'
  END;
  v_correlacao := COALESCE(
    v_titulo.idempotency_key,
    v_titulo.origem_sistema || ':' || v_titulo.numero_documento
  );

  INSERT INTO public.webhook_outbox (
    empresa_representada_id, webhook_config_id, evento, idempotency_key, payload
  )
  SELECT
    NEW.empresa_representada_id,
    config.id,
    'titulo.liquidado',
    NEW.idempotency_key,
    jsonb_build_object(
      'type', v_evento,
      'data', jsonb_build_object(
        'titulo_id', NEW.titulo_id,
        'tipo_titulo', NEW.tipo_titulo,
        'valor_pago', NEW.valor_pago,
        'data_pagamento', NEW.data_pagamento,
        'forma_pagamento', NEW.forma_pagamento,
        'observacoes', NEW.observacoes
      ),
      'origem_sistema', 'novusai-erp',
      'idempotency_key', v_correlacao,
      'timestamp', now()
    )
  FROM public.webhook_configs config
  WHERE config.empresa_representada_id = NEW.empresa_representada_id
    AND config.ativo = true
    AND config.eventos @> jsonb_build_array('titulo.liquidado')
  ON CONFLICT (webhook_config_id, evento, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;
