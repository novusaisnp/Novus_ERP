-- Correcao de uma correcao: a migration anterior (20260914130000) reescreveu
-- enfileirar_webhook_titulo_liquidado() sem antes ler as revisoes intermediarias
-- (20260811220100/220400/220500), que ja tinham resolvido o formato do envelope
-- (type/data no nivel raiz) e adicionado a logica de valor acumulado (soma
-- pagamentos parciais anteriores via contas_receber.valor_recebido antes de
-- decidir receivable.paid vs receivable.partially_paid). Essa correcao restaura
-- essa logica, mantendo a parte que de fato precisava mudar: a idempotency_key
-- agora usa satelite_organization_id/satelite_idempotency_prefixo (de
-- webhook_configs, ver 20260914130000) em vez de depender de
-- contas_receber.idempotency_key/origem_sistema — colunas que, nos titulos
-- reais que geraram os 4 registros travados em webhook_outbox, estavam nulas
-- (por isso a idempotency_key saia como NULL em vez de invalida/UUID).
CREATE OR REPLACE FUNCTION public.enfileirar_webhook_titulo_liquidado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo public.contas_receber%ROWTYPE;
  v_evento text;
  v_valor_acumulado numeric;
BEGIN
  -- Porta 2 so tem consumidor real para recebimentos.
  IF NEW.tipo_titulo <> 'CONTAS_RECEBER' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_titulo
  FROM public.contas_receber
  WHERE id = NEW.titulo_id
    AND empresa_representada_id = NEW.empresa_representada_id;

  IF NOT FOUND OR v_titulo.numero_documento IS NULL THEN
    RETURN NEW;
  END IF;

  v_valor_acumulado := COALESCE(v_titulo.valor_recebido, 0) + NEW.valor_pago;
  v_evento := CASE
    WHEN v_valor_acumulado >= v_titulo.valor_original THEN 'receivable.paid'
    ELSE 'receivable.partially_paid'
  END;

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
        'valor_pago', v_valor_acumulado,
        'data_pagamento', NEW.data_pagamento,
        'forma_pagamento', NEW.forma_pagamento,
        'observacoes', NEW.observacoes
      ),
      'origem_sistema', 'novusai-erp',
      'idempotency_key',
        config.satelite_idempotency_prefixo || ':' || config.satelite_organization_id || ':' || v_titulo.numero_documento,
      'timestamp', now()
    )
  FROM public.webhook_configs config
  WHERE config.empresa_representada_id = NEW.empresa_representada_id
    AND config.ativo = true
    AND config.eventos @> jsonb_build_array('titulo.liquidado')
    AND config.satelite_organization_id IS NOT NULL
    AND config.satelite_idempotency_prefixo IS NOT NULL
  ON CONFLICT (webhook_config_id, evento, idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;
