
-- =====================================================================
-- P15.1 — Conciliação Bancária: Schema
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) banco_extratos_importados
-- ---------------------------------------------------------------------
CREATE TABLE public.banco_extratos_importados (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id  uuid NOT NULL REFERENCES public.empresas_representadas(id),
  conta_bancaria_id        uuid NOT NULL REFERENCES public.contas_bancarias(id),
  nome_arquivo             text NOT NULL,
  hash_arquivo             text NOT NULL,
  formato                  text NOT NULL CHECK (formato IN ('OFX','CSV','CNAB240')),
  data_inicial             date,
  data_final               date,
  saldo_inicial            numeric(15,2),
  saldo_final              numeric(15,2),
  status                   text NOT NULL DEFAULT 'PROCESSANDO'
                             CHECK (status IN ('PROCESSANDO','IMPORTADO','FALHA','REVERTIDO')),
  total_lancamentos        integer NOT NULL DEFAULT 0,
  erro_mensagem            text,
  storage_path             text,
  created_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_extratos_importados TO authenticated;
GRANT ALL ON public.banco_extratos_importados TO service_role;

ALTER TABLE public.banco_extratos_importados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bei_select" ON public.banco_extratos_importados FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bei_insert" ON public.banco_extratos_importados FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bei_update" ON public.banco_extratos_importados FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bei_delete" ON public.banco_extratos_importados FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX uq_bei_hash_conta
  ON public.banco_extratos_importados (conta_bancaria_id, hash_arquivo)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bei_empresa_conta_data
  ON public.banco_extratos_importados (empresa_representada_id, conta_bancaria_id, data_inicial DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bei_status
  ON public.banco_extratos_importados (status)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 2) banco_movimentacoes_extrato
-- ---------------------------------------------------------------------
CREATE TABLE public.banco_movimentacoes_extrato (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id   uuid NOT NULL REFERENCES public.empresas_representadas(id),
  extrato_importado_id      uuid NOT NULL REFERENCES public.banco_extratos_importados(id) ON DELETE CASCADE,
  conta_bancaria_id         uuid NOT NULL REFERENCES public.contas_bancarias(id),
  fit_id                    text,
  data_movimento            date NOT NULL,
  valor                     numeric(15,2) NOT NULL,
  descricao                 text NOT NULL,
  historico                 text,
  tipo                      text NOT NULL CHECK (tipo IN ('CREDITO','DEBITO')),
  documento                 text,
  status_conciliacao        text NOT NULL DEFAULT 'PENDENTE'
                              CHECK (status_conciliacao IN ('PENDENTE','SUGERIDO','CONCILIADO','IGNORADO')),
  movimentacao_bancaria_id  uuid REFERENCES public.movimentacoes_bancarias(id),
  regra_id                  uuid,
  score_match               numeric(4,3),
  grupo_conciliacao_id      uuid,
  conciliado_em             timestamptz,
  conciliado_por            uuid,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_movimentacoes_extrato TO authenticated;
GRANT ALL ON public.banco_movimentacoes_extrato TO service_role;

ALTER TABLE public.banco_movimentacoes_extrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bme_select" ON public.banco_movimentacoes_extrato FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bme_insert" ON public.banco_movimentacoes_extrato FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bme_update" ON public.banco_movimentacoes_extrato FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bme_delete" ON public.banco_movimentacoes_extrato FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX uq_bme_fitid_conta
  ON public.banco_movimentacoes_extrato (conta_bancaria_id, fit_id)
  WHERE fit_id IS NOT NULL;
CREATE INDEX idx_bme_conta_data
  ON public.banco_movimentacoes_extrato (conta_bancaria_id, data_movimento);
CREATE INDEX idx_bme_status
  ON public.banco_movimentacoes_extrato (status_conciliacao);
CREATE INDEX idx_bme_valor_data
  ON public.banco_movimentacoes_extrato (valor, data_movimento);
CREATE INDEX idx_bme_extrato
  ON public.banco_movimentacoes_extrato (extrato_importado_id);
CREATE INDEX idx_bme_grupo
  ON public.banco_movimentacoes_extrato (grupo_conciliacao_id)
  WHERE grupo_conciliacao_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- 3) banco_regras_conciliacao
-- ---------------------------------------------------------------------
CREATE TABLE public.banco_regras_conciliacao (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id  uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome                     text NOT NULL,
  prioridade               integer NOT NULL DEFAULT 100,
  ativa                    boolean NOT NULL DEFAULT true,
  tipo                     text NOT NULL CHECK (tipo IN ('PALAVRA_CHAVE','VALOR_EXATO','REGEX','CONTRAPARTE')),
  padrao                   text,
  tolerancia_valor         numeric(15,2) NOT NULL DEFAULT 0,
  tolerancia_dias          integer NOT NULL DEFAULT 0,
  natureza_id              uuid,
  plano_conta_id           uuid REFERENCES public.plano_contas(id),
  centro_custo_id          uuid REFERENCES public.centros_custo(id),
  contraparte_tipo         text CHECK (contraparte_tipo IN ('CLIENTE','FORNECEDOR')),
  contraparte_id           uuid,
  observacoes              text,
  created_by               uuid,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.banco_regras_conciliacao TO authenticated;
GRANT ALL ON public.banco_regras_conciliacao TO service_role;

ALTER TABLE public.banco_regras_conciliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brc_select" ON public.banco_regras_conciliacao FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "brc_insert" ON public.banco_regras_conciliacao FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "brc_update" ON public.banco_regras_conciliacao FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "brc_delete" ON public.banco_regras_conciliacao FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_brc_empresa_prioridade
  ON public.banco_regras_conciliacao (empresa_representada_id, prioridade)
  WHERE ativa = true AND deleted_at IS NULL;

-- FK diferido para regra_id em movimentacoes_extrato
ALTER TABLE public.banco_movimentacoes_extrato
  ADD CONSTRAINT fk_bme_regra
  FOREIGN KEY (regra_id) REFERENCES public.banco_regras_conciliacao(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- 4) banco_conciliacao_log (append-only, imutável)
-- ---------------------------------------------------------------------
CREATE TABLE public.banco_conciliacao_log (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id     uuid NOT NULL REFERENCES public.empresas_representadas(id),
  movimentacao_extrato_id     uuid REFERENCES public.banco_movimentacoes_extrato(id) ON DELETE SET NULL,
  movimentacao_bancaria_id    uuid REFERENCES public.movimentacoes_bancarias(id) ON DELETE SET NULL,
  acao                        text NOT NULL CHECK (acao IN ('AUTO_MATCH','MANUAL_MATCH','UNMATCH','CRIADO_LANCAMENTO','IGNORADO','IMPORTADO','REVERTIDO')),
  usuario_id                  uuid,
  snapshot                    jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

-- Log é append-only: apenas SELECT + INSERT via policies
GRANT SELECT, INSERT ON public.banco_conciliacao_log TO authenticated;
GRANT ALL ON public.banco_conciliacao_log TO service_role;

ALTER TABLE public.banco_conciliacao_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcl_select" ON public.banco_conciliacao_log FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bcl_insert" ON public.banco_conciliacao_log FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(), 'admin'::app_role));
-- Não há policies de UPDATE/DELETE — log é imutável para usuários finais.

CREATE INDEX idx_bcl_extrato ON public.banco_conciliacao_log (movimentacao_extrato_id);
CREATE INDEX idx_bcl_mov     ON public.banco_conciliacao_log (movimentacao_bancaria_id);
CREATE INDEX idx_bcl_empresa_data ON public.banco_conciliacao_log (empresa_representada_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 5) Coluna em movimentacoes_bancarias (link reverso ao extrato)
-- ---------------------------------------------------------------------
ALTER TABLE public.movimentacoes_bancarias
  ADD COLUMN IF NOT EXISTS movimentacao_extrato_id uuid
    REFERENCES public.banco_movimentacoes_extrato(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mb_extrato
  ON public.movimentacoes_bancarias (movimentacao_extrato_id)
  WHERE movimentacao_extrato_id IS NOT NULL;

-- Índice para busca de candidatos de match (conta + valor + data)
CREATE INDEX IF NOT EXISTS idx_mb_match_candidatos
  ON public.movimentacoes_bancarias (conta_bancaria_id, valor, data_lancamento)
  WHERE conciliado = false AND deleted_at IS NULL;

-- ---------------------------------------------------------------------
-- 6) Triggers de updated_at
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_bei_updated_at BEFORE UPDATE ON public.banco_extratos_importados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_bme_updated_at BEFORE UPDATE ON public.banco_movimentacoes_extrato
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brc_updated_at BEFORE UPDATE ON public.banco_regras_conciliacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 7) Storage: policies do bucket privado 'banco-extratos'
--    Path convention: <empresa_id>/<extrato_id>.<ext>
-- ---------------------------------------------------------------------
CREATE POLICY "banco_extratos_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'banco-extratos'
    AND (
      public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY "banco_extratos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'banco-extratos'
    AND (
      public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY "banco_extratos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'banco-extratos'
    AND (
      public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );
CREATE POLICY "banco_extratos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'banco-extratos'
    AND (
      public.user_has_access_to_empresa((storage.foldername(name))[1]::uuid)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

-- ---------------------------------------------------------------------
-- 8) RPC stubs (P15.2 implementará a lógica)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sugerir_matches_extrato(p_extrato_id uuid)
RETURNS TABLE(movimentacao_extrato_id uuid, candidato_id uuid, score numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- P15.2: lógica de match automático será implementada aqui.
  RAISE NOTICE 'sugerir_matches_extrato stub — P15.2 pendente';
  RETURN;
END;
$$;
REVOKE ALL ON FUNCTION public.sugerir_matches_extrato(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sugerir_matches_extrato(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.confirmar_match(
  p_movimentacao_extrato_id uuid,
  p_movimentacao_bancaria_id uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'confirmar_match stub — P15.2 pendente';
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_match(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_match(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.desfazer_conciliacao(p_movimentacao_extrato_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'desfazer_conciliacao stub — P15.2 pendente';
END;
$$;
REVOKE ALL ON FUNCTION public.desfazer_conciliacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.desfazer_conciliacao(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reverter_extrato(p_extrato_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'reverter_extrato stub — P15.2 pendente';
END;
$$;
REVOKE ALL ON FUNCTION public.reverter_extrato(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reverter_extrato(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.criar_lancamento_do_extrato(
  p_movimentacao_extrato_id uuid,
  p_natureza_id             uuid,
  p_plano_conta_id          uuid,
  p_centro_custo_id         uuid
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE NOTICE 'criar_lancamento_do_extrato stub — P15.2 pendente';
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.criar_lancamento_do_extrato(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.criar_lancamento_do_extrato(uuid,uuid,uuid,uuid) TO authenticated, service_role;
