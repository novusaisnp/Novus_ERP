
ALTER TABLE public.fiscal_eventos DROP CONSTRAINT IF EXISTS fiscal_eventos_tipo_check;
ALTER TABLE public.fiscal_eventos DROP CONSTRAINT IF EXISTS fiscal_eventos_status_check;

ALTER TABLE public.fiscal_eventos
  ADD CONSTRAINT fiscal_eventos_tipo_check
  CHECK (lower(tipo::text) IN (
    'cancelamento','carta_correcao','cce','inutilizacao','consulta','manifestacao',
    'autorizacao','processamento','rejeicao','denegacao','erro_emissao'
  ));

ALTER TABLE public.fiscal_eventos
  ADD CONSTRAINT fiscal_eventos_status_check
  CHECK (lower(status::text) IN (
    'processando','registrado','rejeitado','erro',
    'autorizada','cancelada','denegada','rejeitada'
  ));
