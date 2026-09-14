-- Corrige incompatibilidade de contrato entre o webhook de saida titulo.liquidado
-- (ERP -> satelite) e o receptor real do Educacional (edu-erp-webhook), achada
-- na investigacao do A09 (2026-09-14): 100% das entregas desde 2026-08-11
-- falhavam com "Missing or invalid idempotency_key", porque o ERP mandava
-- {evento, dados: {..., idempotency_key}} e o receptor espera
-- {type, data: {...}, idempotency_key} com idempotency_key no NIVEL RAIZ, no
-- formato "<prefixo-satelite>:<organization_id>:<numero_documento>" (nao um
-- UUID cru). Ver novus-ai-educacional-54/supabase/functions/edu-erp-webhook/index.ts.

-- Guarda por config de webhook os dados que o satelite de destino exige no
-- envelope (organization_id + prefixo da idempotency_key) — nao existia
-- mapeamento nenhum (centelha.licencas, que deveria guardar isso via
-- provisionamento automatico, esta vazia: essa conexao foi montada na mao).
-- Ambos NULL = satelite nao exige esse formato (comportamento antigo).
ALTER TABLE public.webhook_configs
  ADD COLUMN IF NOT EXISTS satelite_organization_id text,
  ADD COLUMN IF NOT EXISTS satelite_idempotency_prefixo text;

COMMENT ON COLUMN public.webhook_configs.satelite_organization_id IS
  'organization_id (ou equivalente) do satelite de destino, usado para montar '
  'a idempotency_key no formato que o receptor exige. NULL = nao se aplica.';
COMMENT ON COLUMN public.webhook_configs.satelite_idempotency_prefixo IS
  'Prefixo fixo (nome do satelite) esperado no inicio da idempotency_key pelo '
  'receptor, ex.: "novus-educacional". NULL = nao se aplica.';

-- Valores reais confirmados direto no banco do Educacional (organizations,
-- unica linha: "Allegra Centro Educacional") e no codigo do receptor
-- (parseIdempotencyKey exige o literal "novus-educacional").
UPDATE public.webhook_configs
SET satelite_organization_id = '0f07e009-bc32-427a-9644-ad43e3cf5f99',
    satelite_idempotency_prefixo = 'novus-educacional'
WHERE nome = 'novus-educacional-liquidacoes';

CREATE OR REPLACE FUNCTION public.enfileirar_webhook_titulo_liquidado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero_documento text;
BEGIN
  -- Este evento so existe hoje para titulos a receber (o unico receptor real
  -- so entende "receivable.*"); contas a pagar nunca tiveram consumidor para
  -- este webhook.
  IF NEW.tipo_titulo <> 'CONTAS_RECEBER' THEN
    RETURN NEW;
  END IF;

  SELECT numero_documento INTO v_numero_documento
  FROM public.contas_receber
  WHERE id = NEW.titulo_id;

  IF v_numero_documento IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.webhook_outbox (
    empresa_representada_id, webhook_config_id, evento, idempotency_key, payload
  )
  SELECT
    NEW.empresa_representada_id,
    config.id,
    'titulo.liquidado',
    NEW.idempotency_key,
    jsonb_build_object(
      'type', CASE
        WHEN NEW.valor_pago >= NEW.valor_original_titulo THEN 'receivable.paid'
        ELSE 'receivable.partially_paid'
      END,
      'data', jsonb_build_object(
        'titulo_id', NEW.titulo_id,
        'tipo_titulo', NEW.tipo_titulo,
        'valor_pago', NEW.valor_pago,
        'data_pagamento', NEW.data_pagamento,
        'forma_pagamento', NEW.forma_pagamento,
        'observacoes', NEW.observacoes
      ),
      'origem_sistema', 'novusai-erp',
      'idempotency_key',
        config.satelite_idempotency_prefixo || ':' || config.satelite_organization_id || ':' || v_numero_documento,
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
