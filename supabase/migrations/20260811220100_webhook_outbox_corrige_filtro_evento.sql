-- Reinstala o trigger sem literal JSON, evitando corrupção por clientes SQL/shell.
CREATE OR REPLACE FUNCTION public.enfileirar_webhook_titulo_liquidado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.webhook_outbox (
    empresa_representada_id, webhook_config_id, evento, idempotency_key, payload
  )
  SELECT
    NEW.empresa_representada_id,
    config.id,
    'titulo.liquidado',
    NEW.idempotency_key,
    jsonb_build_object(
      'evento', 'titulo.liquidado',
      'ocorrido_em', now(),
      'empresa_representada_id', NEW.empresa_representada_id,
      'dados', jsonb_build_object(
        'liquidacao_id', NEW.id,
        'titulo_id', NEW.titulo_id,
        'tipo_titulo', NEW.tipo_titulo,
        'valor', NEW.valor_pago,
        'data_pagamento', NEW.data_pagamento,
        'forma_pagamento', NEW.forma_pagamento,
        'idempotency_key', NEW.idempotency_key
      )
    )
  FROM public.webhook_configs config
  WHERE config.empresa_representada_id = NEW.empresa_representada_id
    AND config.ativo = true
    AND config.eventos @> jsonb_build_array('titulo.liquidado')
  ON CONFLICT (webhook_config_id, evento, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;
