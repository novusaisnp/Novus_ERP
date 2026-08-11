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
