
ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS movimentacao_extrato_id uuid NULL
  REFERENCES public.banco_movimentacoes_extrato(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mov_banc_mov_extrato_id
  ON public.movimentacoes_bancarias(movimentacao_extrato_id)
  WHERE movimentacao_extrato_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.sugerir_matches_extrato(uuid);
DROP FUNCTION IF EXISTS public.confirmar_match(uuid, uuid);
DROP FUNCTION IF EXISTS public.desfazer_conciliacao(uuid);
DROP FUNCTION IF EXISTS public.reverter_extrato(uuid);
DROP FUNCTION IF EXISTS public.criar_lancamento_do_extrato(uuid, jsonb);

CREATE FUNCTION public.sugerir_matches_extrato(p_extrato_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IMPLEMENTED_P15_1', 'extrato_id', p_extrato_id);
END; $$;

CREATE FUNCTION public.confirmar_match(p_extrato_linha_id uuid, p_movimentacao_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IMPLEMENTED_P15_1',
    'extrato_linha_id', p_extrato_linha_id, 'movimentacao_id', p_movimentacao_id);
END; $$;

CREATE FUNCTION public.desfazer_conciliacao(p_extrato_linha_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IMPLEMENTED_P15_1', 'extrato_linha_id', p_extrato_linha_id);
END; $$;

CREATE FUNCTION public.reverter_extrato(p_extrato_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IMPLEMENTED_P15_1', 'extrato_id', p_extrato_id);
END; $$;

CREATE FUNCTION public.criar_lancamento_do_extrato(p_extrato_linha_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;
  RETURN jsonb_build_object('ok', false, 'reason', 'NOT_IMPLEMENTED_P15_1',
    'extrato_linha_id', p_extrato_linha_id, 'payload', p_payload);
END; $$;

REVOKE ALL ON FUNCTION public.sugerir_matches_extrato(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_match(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.desfazer_conciliacao(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverter_extrato(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_lancamento_do_extrato(uuid, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sugerir_matches_extrato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_match(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desfazer_conciliacao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverter_extrato(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_lancamento_do_extrato(uuid, jsonb) TO authenticated;
