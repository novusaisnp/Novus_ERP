
-- =========================================================================
-- Rollout V2 tenant ops — funções idempotentes com guardrails
-- =========================================================================

-- A) check_v2_readiness
CREATE OR REPLACE FUNCTION public.check_v2_readiness(
  p_tenant uuid,
  p_nome text,
  p_min_events int DEFAULT 20
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state text;
  v_v2_enforced_at timestamptz;
  v_v1_7d int;
  v_v2_ok_7d int;
  v_v2_err_7d int;
  v_dup_7d int;
  v_total_7d int;
  v_ready boolean := false;
  v_reason text := 'ok';
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT signature_version, v2_enforced_at
    INTO v_state, v_v2_enforced_at
  FROM public.webhook_configs
  WHERE empresa_representada_id = p_tenant AND nome = p_nome;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object(
      'status','not_found','current_state',NULL,'ready',false,
      'reason','webhook_config_not_found','executed_at',now()
    );
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE signature_version = 'v1'),
    COUNT(*) FILTER (WHERE signature_version = 'v2' AND outcome <> 'error'),
    COUNT(*) FILTER (WHERE signature_version = 'v2' AND outcome = 'error'),
    COUNT(*) FILTER (WHERE outcome = 'duplicate'),
    COUNT(*)
  INTO v_v1_7d, v_v2_ok_7d, v_v2_err_7d, v_dup_7d, v_total_7d
  FROM public.webhook_deliveries
  WHERE empresa_representada_id = p_tenant
    AND source_system = p_nome
    AND created_at >= now() - interval '7 days';

  IF v_v1_7d > 0 THEN
    v_reason := 'v1_traffic_still_present';
  ELSIF v_v2_err_7d > 0 THEN
    v_reason := 'v2_errors_present';
  ELSIF v_v2_ok_7d < p_min_events THEN
    v_reason := format('v2_ok_below_min_events (%s<%s)', v_v2_ok_7d, p_min_events);
  ELSE
    v_ready := true;
  END IF;

  RETURN jsonb_build_object(
    'status','ok',
    'current_state', v_state,
    'v2_enforced_at', v_v2_enforced_at,
    'v1_7d', v_v1_7d,
    'v2_ok_7d', v_v2_ok_7d,
    'v2_err_7d', v_v2_err_7d,
    'duplicates_7d', v_dup_7d,
    'total_7d', v_total_7d,
    'min_events', p_min_events,
    'ready', v_ready,
    'reason', v_reason,
    'executed_at', now()
  );
END; $$;

-- B) promote_to_dual (v1 -> dual; idempotente)
CREATE OR REPLACE FUNCTION public.promote_to_dual(p_tenant uuid, p_nome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state text; v_changed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT signature_version INTO v_state
  FROM public.webhook_configs
  WHERE empresa_representada_id = p_tenant AND nome = p_nome;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('status','not_found','reason','config_not_found','changed_rows',0,'executed_at',now());
  END IF;

  IF v_state = 'dual' THEN
    RETURN jsonb_build_object('status','noop','current_state','dual','reason','already_dual','changed_rows',0,'executed_at',now());
  END IF;

  IF v_state <> 'v1' THEN
    RETURN jsonb_build_object('status','blocked','current_state',v_state,'reason','only_v1_can_move_to_dual','changed_rows',0,'executed_at',now());
  END IF;

  UPDATE public.webhook_configs
     SET signature_version='dual', v2_only=false, updated_at=now()
   WHERE empresa_representada_id = p_tenant AND nome = p_nome;
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  RETURN jsonb_build_object('status','ok','current_state','dual','reason','promoted','changed_rows',v_changed,'executed_at',now());
END; $$;

-- C) promote_to_v2_only (dual -> v2_only, com guardrail via check_v2_readiness)
CREATE OR REPLACE FUNCTION public.promote_to_v2_only(
  p_tenant uuid, p_nome text, p_min_events int DEFAULT 20
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_check jsonb; v_state text; v_changed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  v_check := public.check_v2_readiness(p_tenant, p_nome, p_min_events);
  v_state := v_check->>'current_state';

  IF (v_check->>'status') = 'not_found' THEN
    RETURN jsonb_build_object('status','not_found','reason','config_not_found','changed_rows',0,'readiness',v_check,'executed_at',now());
  END IF;

  IF v_state <> 'dual' THEN
    RETURN jsonb_build_object('status','blocked','current_state',v_state,'reason','only_dual_can_move_to_v2_only','changed_rows',0,'readiness',v_check,'executed_at',now());
  END IF;

  IF NOT (v_check->>'ready')::boolean THEN
    RETURN jsonb_build_object('status','blocked','current_state',v_state,'reason',v_check->>'reason','changed_rows',0,'readiness',v_check,'executed_at',now());
  END IF;

  UPDATE public.webhook_configs
     SET signature_version='v2', v2_only=true, v2_enforced_at=now(), updated_at=now()
   WHERE empresa_representada_id = p_tenant AND nome = p_nome;
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  RETURN jsonb_build_object('status','ok','current_state','v2','reason','enforced','changed_rows',v_changed,'readiness',v_check,'executed_at',now());
END; $$;

-- D) rollback_to_dual
CREATE OR REPLACE FUNCTION public.rollback_to_dual(p_tenant uuid, p_nome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state text; v_changed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT signature_version INTO v_state
  FROM public.webhook_configs
  WHERE empresa_representada_id = p_tenant AND nome = p_nome;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('status','not_found','reason','config_not_found','changed_rows',0,'executed_at',now());
  END IF;

  UPDATE public.webhook_configs
     SET signature_version='dual', v2_only=false, v2_enforced_at=NULL, updated_at=now()
   WHERE empresa_representada_id = p_tenant AND nome = p_nome;
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  RETURN jsonb_build_object('status','ok','current_state','dual','reason','rolled_back','changed_rows',v_changed,'executed_at',now());
END; $$;

-- E) rollback_to_v1
CREATE OR REPLACE FUNCTION public.rollback_to_v1(p_tenant uuid, p_nome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_state text; v_changed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  SELECT signature_version INTO v_state
  FROM public.webhook_configs
  WHERE empresa_representada_id = p_tenant AND nome = p_nome;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('status','not_found','reason','config_not_found','changed_rows',0,'executed_at',now());
  END IF;

  UPDATE public.webhook_configs
     SET signature_version='v1', v2_only=false, v2_enforced_at=NULL, updated_at=now()
   WHERE empresa_representada_id = p_tenant AND nome = p_nome;
  GET DIAGNOSTICS v_changed = ROW_COUNT;

  RETURN jsonb_build_object('status','ok','current_state','v1','reason','rolled_back_v1','changed_rows',v_changed,'executed_at',now());
END; $$;

-- F) precheck_source_system_nome_consistency
CREATE OR REPLACE FUNCTION public.precheck_source_system_nome_consistency()
RETURNS TABLE(
  empresa_representada_id uuid,
  nome text,
  signature_version text,
  distinct_source_systems text[],
  event_count bigint,
  consistent boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'access_denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT wc.empresa_representada_id,
         wc.nome,
         wc.signature_version,
         COALESCE(array_agg(DISTINCT wd.source_system) FILTER (WHERE wd.source_system IS NOT NULL), ARRAY[]::text[]),
         COUNT(wd.*)::bigint,
         (COALESCE(array_agg(DISTINCT wd.source_system) FILTER (WHERE wd.source_system IS NOT NULL), ARRAY[]::text[])
            = ARRAY[wc.nome]::text[]
          OR COUNT(wd.*) = 0)
  FROM public.webhook_configs wc
  LEFT JOIN public.webhook_deliveries wd
    ON wd.empresa_representada_id = wc.empresa_representada_id
   AND wd.created_at >= now() - interval '7 days'
  WHERE wc.ativo = true
  GROUP BY wc.empresa_representada_id, wc.nome, wc.signature_version;
END; $$;

GRANT EXECUTE ON FUNCTION public.check_v2_readiness(uuid,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_dual(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_v2_only(uuid,text,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_to_dual(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_to_v1(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.precheck_source_system_nome_consistency() TO authenticated;
