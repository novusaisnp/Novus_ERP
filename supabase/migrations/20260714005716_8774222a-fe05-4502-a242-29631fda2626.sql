
CREATE INDEX IF NOT EXISTS idx_fde_venda_created
  ON public.fiscal_documentos_eletronicos (venda_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_ultimo_documento_por_venda(venda_ids uuid[])
RETURNS TABLE (
  venda_id uuid,
  documento_id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (d.venda_id)
    d.venda_id,
    d.id AS documento_id,
    d.status::text,
    d.updated_at
  FROM public.fiscal_documentos_eletronicos d
  WHERE d.venda_id = ANY (venda_ids)
    AND d.deleted_at IS NULL
  ORDER BY d.venda_id, d.updated_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_ultimo_documento_por_venda(uuid[]) TO authenticated, service_role;

INSERT INTO public.report_ops_alerts (kind, severity, reason, payload)
VALUES
  ('fiscal_processando_stuck', 'warning',
   'Documentos fiscais em status "processando" há mais de 10 minutos',
   jsonb_build_object('threshold_minutes', 10, 'mock_mode', true)),
  ('fiscal_rejeicao_alta', 'page',
   'Taxa de rejeição de NF-e acima de 5% na última hora',
   jsonb_build_object('threshold_pct', 5, 'window_minutes', 60)),
  ('fiscal_erro_edge', 'page',
   'Mais de 3 erros internal_error em edge functions fiscais em 15 minutos',
   jsonb_build_object('threshold_count', 3, 'window_minutes', 15)),
  ('fiscal_certificado_expira', 'warning',
   'Certificado A1 expira em menos de 30 dias',
   jsonb_build_object('threshold_days', 30))
ON CONFLICT DO NOTHING;
