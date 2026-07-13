
-- pg_trgm para similaridade
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- =====================================================================
-- sugerir_matches_extrato: percorre linhas PENDENTES do extrato e propõe/aplica match
-- =====================================================================
CREATE OR REPLACE FUNCTION public.sugerir_matches_extrato(p_extrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_extrato       record;
  v_linha         record;
  v_cand          record;
  v_best          record;
  v_second_score  numeric;
  v_score         numeric;
  v_conciliados   int := 0;
  v_sugeridos     int := 0;
  v_pendentes     int := 0;
  v_processadas   int := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_extrato FROM public.banco_extratos_importados
   WHERE id = p_extrato_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXTRATO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_extrato.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  FOR v_linha IN
    SELECT * FROM public.banco_movimentacoes_extrato
     WHERE extrato_importado_id = p_extrato_id
       AND status_conciliacao = 'PENDENTE'
     ORDER BY data_movimento, id
  LOOP
    v_processadas := v_processadas + 1;
    v_best := NULL;
    v_second_score := 0;

    -- Candidatos: mesma conta, mesmo valor absoluto e sinal (valor negativo → saída), data ±5d, não conciliada
    FOR v_cand IN
      SELECT mb.id, mb.data_lancamento, mb.valor, mb.tipo, mb.descricao,
             (
               CASE WHEN abs(mb.valor - abs(v_linha.valor)) < 0.005 THEN 0.5
                    WHEN abs(mb.valor - abs(v_linha.valor)) < (abs(v_linha.valor)*0.005) THEN 0.35
                    ELSE 0 END
             + CASE WHEN mb.data_lancamento = v_linha.data_movimento THEN 0.3
                    WHEN abs(mb.data_lancamento - v_linha.data_movimento) <= 2 THEN 0.2
                    WHEN abs(mb.data_lancamento - v_linha.data_movimento) <= 5 THEN 0.1
                    ELSE 0 END
             + COALESCE(extensions.similarity(lower(mb.descricao), lower(v_linha.descricao)) * 0.2, 0)
             ) AS score
      FROM public.movimentacoes_bancarias mb
      WHERE mb.empresa_representada_id = v_extrato.empresa_representada_id
        AND mb.conta_bancaria_id = v_linha.conta_bancaria_id
        AND mb.deleted_at IS NULL
        AND COALESCE(mb.conciliado, false) = false
        AND mb.movimentacao_extrato_id IS NULL
        AND abs(mb.valor - abs(v_linha.valor)) <= GREATEST(0.01, abs(v_linha.valor)*0.01)
        AND abs(mb.data_lancamento - v_linha.data_movimento) <= 5
        AND (
             (v_linha.valor < 0 AND mb.tipo IN ('SAQUE','TRANSFERENCIA_SAIDA','AJUSTE_NEGATIVO','PIX_SAIDA','TED_SAIDA','DOC_SAIDA','BOLETO','TARIFA'))
          OR (v_linha.valor >= 0 AND mb.tipo IN ('DEPOSITO','TRANSFERENCIA_ENTRADA','AJUSTE_POSITIVO','PIX_ENTRADA','TED_ENTRADA','DOC_ENTRADA','JUROS'))
        )
      ORDER BY score DESC
      LIMIT 3
    LOOP
      IF v_best IS NULL THEN
        v_best := v_cand;
      ELSIF v_cand.score > v_second_score THEN
        v_second_score := v_cand.score;
      END IF;
    END LOOP;

    IF v_best IS NULL THEN
      UPDATE public.banco_movimentacoes_extrato
         SET status_conciliacao = 'PENDENTE', score_match = NULL, updated_at = now()
       WHERE id = v_linha.id;
      v_pendentes := v_pendentes + 1;
    ELSIF v_best.score >= 0.9 AND (v_best.score - v_second_score) >= 0.15 THEN
      -- Auto-concilia (score alto e sem ambiguidade)
      UPDATE public.banco_movimentacoes_extrato
         SET status_conciliacao = 'CONCILIADO',
             movimentacao_bancaria_id = v_best.id,
             score_match = v_best.score,
             conciliado_em = now(),
             conciliado_por = auth.uid(),
             updated_at = now()
       WHERE id = v_linha.id;

      UPDATE public.movimentacoes_bancarias
         SET movimentacao_extrato_id = v_linha.id
       WHERE id = v_best.id;

      INSERT INTO public.banco_conciliacao_log
        (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
      VALUES (v_extrato.empresa_representada_id, v_linha.id, v_best.id, 'MATCH_AUTO', auth.uid(),
              jsonb_build_object('score', v_best.score, 'second_score', v_second_score));
      v_conciliados := v_conciliados + 1;
    ELSIF v_best.score >= 0.7 THEN
      UPDATE public.banco_movimentacoes_extrato
         SET status_conciliacao = 'SUGERIDO',
             movimentacao_bancaria_id = v_best.id,
             score_match = v_best.score,
             updated_at = now()
       WHERE id = v_linha.id;

      INSERT INTO public.banco_conciliacao_log
        (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
      VALUES (v_extrato.empresa_representada_id, v_linha.id, v_best.id, 'MATCH_SUGERIDO', auth.uid(),
              jsonb_build_object('score', v_best.score, 'second_score', v_second_score));
      v_sugeridos := v_sugeridos + 1;
    ELSE
      UPDATE public.banco_movimentacoes_extrato
         SET status_conciliacao = 'PENDENTE', score_match = v_best.score, movimentacao_bancaria_id = NULL, updated_at = now()
       WHERE id = v_linha.id;
      v_pendentes := v_pendentes + 1;
    END IF;
  END LOOP;

  UPDATE public.banco_extratos_importados
     SET status = 'PROCESSADO', updated_at = now()
   WHERE id = p_extrato_id;

  RETURN jsonb_build_object(
    'ok', true,
    'extrato_id', p_extrato_id,
    'processadas', v_processadas,
    'conciliadas_auto', v_conciliados,
    'sugeridas', v_sugeridos,
    'pendentes', v_pendentes
  );
END;
$$;

-- =====================================================================
-- confirmar_match
-- =====================================================================
CREATE OR REPLACE FUNCTION public.confirmar_match(p_extrato_linha_id uuid, p_movimentacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha record;
  v_mov   record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_linha FROM public.banco_movimentacoes_extrato WHERE id = p_extrato_linha_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINHA_NAO_ENCONTRADA' USING ERRCODE = 'P0001'; END IF;

  SELECT * INTO v_mov FROM public.movimentacoes_bancarias WHERE id = p_movimentacao_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'MOVIMENTACAO_NAO_ENCONTRADA' USING ERRCODE = 'P0001'; END IF;

  IF v_linha.empresa_representada_id <> v_mov.empresa_representada_id THEN
    RAISE EXCEPTION 'EMPRESAS_DIFERENTES' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_linha.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  IF v_linha.status_conciliacao = 'CONCILIADO' THEN
    RETURN jsonb_build_object('ok', true, 'replay', true, 'linha_id', p_extrato_linha_id);
  END IF;

  IF COALESCE(v_mov.conciliado, false) THEN
    RAISE EXCEPTION 'MOVIMENTACAO_JA_CONCILIADA' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.banco_movimentacoes_extrato
     SET status_conciliacao = 'CONCILIADO',
         movimentacao_bancaria_id = p_movimentacao_id,
         conciliado_em = now(),
         conciliado_por = auth.uid(),
         updated_at = now()
   WHERE id = p_extrato_linha_id;

  UPDATE public.movimentacoes_bancarias
     SET movimentacao_extrato_id = p_extrato_linha_id
   WHERE id = p_movimentacao_id;

  INSERT INTO public.banco_conciliacao_log
    (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
  VALUES (v_linha.empresa_representada_id, p_extrato_linha_id, p_movimentacao_id, 'MATCH_MANUAL', auth.uid(),
          jsonb_build_object('score', v_linha.score_match));

  RETURN jsonb_build_object('ok', true, 'linha_id', p_extrato_linha_id, 'movimentacao_id', p_movimentacao_id);
END;
$$;

-- =====================================================================
-- desfazer_conciliacao
-- =====================================================================
CREATE OR REPLACE FUNCTION public.desfazer_conciliacao(p_extrato_linha_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_linha FROM public.banco_movimentacoes_extrato WHERE id = p_extrato_linha_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINHA_NAO_ENCONTRADA' USING ERRCODE = 'P0001'; END IF;

  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_linha.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  IF v_linha.movimentacao_bancaria_id IS NOT NULL THEN
    UPDATE public.movimentacoes_bancarias
       SET movimentacao_extrato_id = NULL
     WHERE id = v_linha.movimentacao_bancaria_id;
  END IF;

  UPDATE public.banco_movimentacoes_extrato
     SET status_conciliacao = 'PENDENTE',
         movimentacao_bancaria_id = NULL,
         score_match = NULL,
         conciliado_em = NULL,
         conciliado_por = NULL,
         updated_at = now()
   WHERE id = p_extrato_linha_id;

  INSERT INTO public.banco_conciliacao_log
    (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
  VALUES (v_linha.empresa_representada_id, p_extrato_linha_id, v_linha.movimentacao_bancaria_id, 'MATCH_DESFEITO', auth.uid(), '{}'::jsonb);

  RETURN jsonb_build_object('ok', true, 'linha_id', p_extrato_linha_id);
END;
$$;

-- =====================================================================
-- reverter_extrato: bloqueia se houver linhas CONCILIADO; senão apaga tudo do extrato
-- =====================================================================
CREATE OR REPLACE FUNCTION public.reverter_extrato(p_extrato_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_extrato record;
  v_conc int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_extrato FROM public.banco_extratos_importados
   WHERE id = p_extrato_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'EXTRATO_NAO_ENCONTRADO' USING ERRCODE = 'P0001'; END IF;

  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_extrato.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_conc FROM public.banco_movimentacoes_extrato
   WHERE extrato_importado_id = p_extrato_id AND status_conciliacao = 'CONCILIADO';
  IF v_conc > 0 THEN
    RAISE EXCEPTION 'EXTRATO_TEM_LINHAS_CONCILIADAS (%)' , v_conc USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.banco_movimentacoes_extrato WHERE extrato_importado_id = p_extrato_id;

  UPDATE public.banco_extratos_importados
     SET deleted_at = now(), status = 'REVERTIDO', updated_at = now()
   WHERE id = p_extrato_id;

  INSERT INTO public.banco_conciliacao_log
    (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
  VALUES (v_extrato.empresa_representada_id, NULL, NULL, 'EXTRATO_REVERTIDO', auth.uid(),
          jsonb_build_object('extrato_id', p_extrato_id));

  RETURN jsonb_build_object('ok', true, 'extrato_id', p_extrato_id);
END;
$$;

-- =====================================================================
-- criar_lancamento_do_extrato: cria movimentacoes_bancarias a partir da linha e concilia
-- =====================================================================
CREATE OR REPLACE FUNCTION public.criar_lancamento_do_extrato(p_extrato_linha_id uuid, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha record;
  v_mov_id uuid;
  v_tipo text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_linha FROM public.banco_movimentacoes_extrato WHERE id = p_extrato_linha_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LINHA_NAO_ENCONTRADA' USING ERRCODE = 'P0001'; END IF;

  IF NOT public.has_role(auth.uid(),'admin')
     AND NOT public.user_has_access_to_empresa(v_linha.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;

  IF v_linha.status_conciliacao = 'CONCILIADO' THEN
    RETURN jsonb_build_object('ok', true, 'replay', true, 'linha_id', p_extrato_linha_id);
  END IF;

  v_tipo := COALESCE(p_payload->>'tipo',
    CASE WHEN v_linha.valor < 0 THEN 'AJUSTE_NEGATIVO' ELSE 'AJUSTE_POSITIVO' END);

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, tipo, valor, data_lancamento,
    descricao, status, natureza_id, plano_conta_id, centro_custo_id,
    movimentacao_extrato_id, created_by
  ) VALUES (
    v_linha.empresa_representada_id, v_linha.conta_bancaria_id, v_tipo, abs(v_linha.valor),
    v_linha.data_movimento, COALESCE(p_payload->>'descricao', v_linha.descricao), 'EFETIVADO',
    NULLIF(p_payload->>'natureza_id','')::uuid,
    NULLIF(p_payload->>'plano_conta_id','')::uuid,
    NULLIF(p_payload->>'centro_custo_id','')::uuid,
    p_extrato_linha_id, auth.uid()
  ) RETURNING id INTO v_mov_id;

  UPDATE public.banco_movimentacoes_extrato
     SET status_conciliacao = 'CONCILIADO',
         movimentacao_bancaria_id = v_mov_id,
         conciliado_em = now(),
         conciliado_por = auth.uid(),
         updated_at = now()
   WHERE id = p_extrato_linha_id;

  INSERT INTO public.banco_conciliacao_log
    (empresa_representada_id, movimentacao_extrato_id, movimentacao_bancaria_id, acao, usuario_id, snapshot)
  VALUES (v_linha.empresa_representada_id, p_extrato_linha_id, v_mov_id, 'LANCAMENTO_CRIADO', auth.uid(), p_payload);

  RETURN jsonb_build_object('ok', true, 'linha_id', p_extrato_linha_id, 'movimentacao_id', v_mov_id);
END;
$$;

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

-- =====================================================================
-- Trigger: mantém movimentacoes_bancarias.conciliado sincronizado
-- =====================================================================
CREATE OR REPLACE FUNCTION public.trg_extrato_marcar_conciliado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Nova conciliação
    IF NEW.status_conciliacao = 'CONCILIADO' AND NEW.movimentacao_bancaria_id IS NOT NULL THEN
      UPDATE public.movimentacoes_bancarias
         SET conciliado = true, data_conciliacao = COALESCE(NEW.conciliado_em, now())
       WHERE id = NEW.movimentacao_bancaria_id;
    END IF;

    -- Desconciliação
    IF TG_OP = 'UPDATE' AND OLD.status_conciliacao = 'CONCILIADO'
       AND (NEW.status_conciliacao <> 'CONCILIADO' OR NEW.movimentacao_bancaria_id IS DISTINCT FROM OLD.movimentacao_bancaria_id) THEN
      IF OLD.movimentacao_bancaria_id IS NOT NULL THEN
        UPDATE public.movimentacoes_bancarias
           SET conciliado = false, data_conciliacao = NULL
         WHERE id = OLD.movimentacao_bancaria_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.movimentacao_bancaria_id IS NOT NULL AND OLD.status_conciliacao = 'CONCILIADO' THEN
    UPDATE public.movimentacoes_bancarias
       SET conciliado = false, data_conciliacao = NULL, movimentacao_extrato_id = NULL
     WHERE id = OLD.movimentacao_bancaria_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_extrato_marcar_conciliado ON public.banco_movimentacoes_extrato;
CREATE TRIGGER trg_extrato_marcar_conciliado
AFTER INSERT OR UPDATE OR DELETE ON public.banco_movimentacoes_extrato
FOR EACH ROW EXECUTE FUNCTION public.trg_extrato_marcar_conciliado();

-- =====================================================================
-- Storage bucket policies: banco-extratos (prefixo = empresa_representada_id)
-- =====================================================================
DROP POLICY IF EXISTS "banco_extratos_select_own_empresa" ON storage.objects;
DROP POLICY IF EXISTS "banco_extratos_insert_own_empresa" ON storage.objects;
DROP POLICY IF EXISTS "banco_extratos_delete_own_empresa" ON storage.objects;

CREATE POLICY "banco_extratos_select_own_empresa"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'banco-extratos'
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.user_has_access_to_empresa( (split_part(name,'/',1))::uuid )
  )
);

CREATE POLICY "banco_extratos_insert_own_empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banco-extratos'
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.user_has_access_to_empresa( (split_part(name,'/',1))::uuid )
  )
);

CREATE POLICY "banco_extratos_delete_own_empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'banco-extratos'
  AND (
    public.has_role(auth.uid(),'admin')
    OR public.user_has_access_to_empresa( (split_part(name,'/',1))::uuid )
  )
);
