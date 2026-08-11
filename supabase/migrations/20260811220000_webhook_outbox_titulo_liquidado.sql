-- Webhooks de saída: primeiro evento, enfileirado na mesma transação da liquidação.
CREATE TABLE public.webhook_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  webhook_config_id uuid NOT NULL REFERENCES public.webhook_configs(id) ON DELETE CASCADE,
  evento text NOT NULL CHECK (evento = 'titulo.liquidado'),
  idempotency_key uuid NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'ENTREGUE', 'ERRO')),
  tentativas integer NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
  proxima_tentativa_em timestamptz NOT NULL DEFAULT now(),
  processando_desde timestamptz,
  entregue_em timestamptz,
  http_status integer,
  resposta text,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webhook_config_id, evento, idempotency_key)
);

CREATE INDEX webhook_outbox_pendentes_idx
  ON public.webhook_outbox (proxima_tentativa_em, created_at)
  WHERE status IN ('PENDENTE', 'PROCESSANDO');

ALTER TABLE public.webhook_outbox ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.webhook_outbox TO authenticated;
GRANT ALL ON public.webhook_outbox TO service_role;

CREATE POLICY "webhook_outbox_admin_read" ON public.webhook_outbox
  FOR SELECT TO authenticated
  USING (
    empresa_representada_id = public.get_user_empresa_id()
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER webhook_outbox_updated_at
  BEFORE UPDATE ON public.webhook_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

CREATE TRIGGER liquidacoes_titulos_webhook_outbox
  AFTER INSERT ON public.liquidacoes_titulos
  FOR EACH ROW EXECUTE FUNCTION public.enfileirar_webhook_titulo_liquidado();

CREATE OR REPLACE FUNCTION public.webhook_outbox_claim(p_limite integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  empresa_representada_id uuid,
  evento text,
  payload jsonb,
  tentativa integer,
  url_destino text,
  metodo text,
  headers jsonb,
  secret_token text,
  timeout_segundos integer,
  max_tentativas integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Acesso restrito ao service_role' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH candidatas AS (
    SELECT outbox.id
    FROM public.webhook_outbox outbox
    WHERE (
      outbox.status = 'PENDENTE'
      AND outbox.proxima_tentativa_em <= now()
    ) OR (
      outbox.status = 'PROCESSANDO'
      AND outbox.processando_desde < now() - interval '5 minutes'
    )
    ORDER BY outbox.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limite, 1), 100)
  ), claimed AS (
    UPDATE public.webhook_outbox outbox
       SET status = 'PROCESSANDO',
           processando_desde = now(),
           tentativas = outbox.tentativas + 1
      FROM candidatas
     WHERE outbox.id = candidatas.id
    RETURNING outbox.*
  )
  SELECT claimed.id, claimed.empresa_representada_id, claimed.evento,
         claimed.payload, claimed.tentativas, config.url_destino, config.metodo::text,
         config.headers, config.secret_token, config.timeout_segundos,
         config.max_tentativas
  FROM claimed
  JOIN public.webhook_configs config ON config.id = claimed.webhook_config_id;
END;
$$;

REVOKE ALL ON FUNCTION public.webhook_outbox_claim(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.webhook_outbox_claim(integer) TO service_role;

COMMENT ON TABLE public.webhook_outbox IS
  'Fila transacional de webhooks enviados pelo ERP; separada de webhook_deliveries, que registra entradas.';
