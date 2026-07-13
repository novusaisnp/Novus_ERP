
-- ============================================================
-- P12: MÓDULO DE ESTOQUE
-- ============================================================

-- =========================
-- 1) TABELAS
-- =========================

CREATE TABLE public.estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  tipo varchar(30) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA','TRANSFERENCIA','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','INVENTARIO')),
  quantidade numeric(15,4) NOT NULL CHECK (quantidade > 0),
  custo_unitario numeric(15,4) NOT NULL DEFAULT 0,
  localizacao_origem_id uuid REFERENCES public.localizacoes_estoque(id),
  localizacao_destino_id uuid REFERENCES public.localizacoes_estoque(id),
  data_movimento timestamptz NOT NULL DEFAULT now(),
  documento_ref varchar(100),
  venda_id uuid REFERENCES public.vendas(id),
  inventario_id uuid,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT mov_transf_locs CHECK (
    tipo <> 'TRANSFERENCIA' OR (localizacao_origem_id IS NOT NULL AND localizacao_destino_id IS NOT NULL AND localizacao_origem_id <> localizacao_destino_id)
  ),
  CONSTRAINT mov_entrada_dest CHECK (
    tipo NOT IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO') OR localizacao_destino_id IS NOT NULL
  ),
  CONSTRAINT mov_saida_orig CHECK (
    tipo NOT IN ('SAIDA','AJUSTE_NEGATIVO') OR localizacao_origem_id IS NOT NULL
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentacoes TO authenticated;
GRANT ALL ON public.estoque_movimentacoes TO service_role;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_mov_select" ON public.estoque_movimentacoes FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_mov_insert" ON public.estoque_movimentacoes FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_mov_update" ON public.estoque_movimentacoes FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_mov_delete" ON public.estoque_movimentacoes FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_estoque_mov_empresa_data ON public.estoque_movimentacoes(empresa_representada_id, data_movimento DESC);
CREATE INDEX idx_estoque_mov_produto_data ON public.estoque_movimentacoes(produto_id, data_movimento DESC);
CREATE INDEX idx_estoque_mov_venda ON public.estoque_movimentacoes(venda_id) WHERE venda_id IS NOT NULL;
CREATE INDEX idx_estoque_mov_inventario ON public.estoque_movimentacoes(inventario_id) WHERE inventario_id IS NOT NULL;
CREATE INDEX idx_estoque_mov_deleted ON public.estoque_movimentacoes(deleted_at);

-- Idempotência: 1 baixa por venda+produto (não deletada)
CREATE UNIQUE INDEX uq_estoque_mov_venda_produto_saida
  ON public.estoque_movimentacoes(venda_id, produto_id)
  WHERE venda_id IS NOT NULL AND tipo = 'SAIDA' AND deleted_at IS NULL;

-- --- inventário ---
CREATE TABLE public.estoque_inventarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  codigo varchar(50) NOT NULL,
  localizacao_id uuid REFERENCES public.localizacoes_estoque(id),
  responsavel_id uuid,
  data_inicio timestamptz NOT NULL DEFAULT now(),
  data_fim timestamptz,
  status varchar(20) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','EM_CONTAGEM','CONCILIADO','CANCELADO')),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (empresa_representada_id, codigo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_inventarios TO authenticated;
GRANT ALL ON public.estoque_inventarios TO service_role;
ALTER TABLE public.estoque_inventarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_inv_select" ON public.estoque_inventarios FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_insert" ON public.estoque_inventarios FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_update" ON public.estoque_inventarios FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_delete" ON public.estoque_inventarios FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_estoque_inv_empresa ON public.estoque_inventarios(empresa_representada_id, data_inicio DESC);

-- FK reversa após criar inventarios
ALTER TABLE public.estoque_movimentacoes
  ADD CONSTRAINT fk_estoque_mov_inventario FOREIGN KEY (inventario_id) REFERENCES public.estoque_inventarios(id);

CREATE TABLE public.estoque_inventario_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  inventario_id uuid NOT NULL REFERENCES public.estoque_inventarios(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  saldo_sistema numeric(15,4) NOT NULL DEFAULT 0,
  saldo_contado numeric(15,4) NOT NULL DEFAULT 0,
  diferenca numeric(15,4) GENERATED ALWAYS AS (saldo_contado - saldo_sistema) STORED,
  custo_unitario numeric(15,4) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inventario_id, produto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_inventario_itens TO authenticated;
GRANT ALL ON public.estoque_inventario_itens TO service_role;
ALTER TABLE public.estoque_inventario_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_inv_it_select" ON public.estoque_inventario_itens FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_it_insert" ON public.estoque_inventario_itens FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_it_update" ON public.estoque_inventario_itens FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_inv_it_delete" ON public.estoque_inventario_itens FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_estoque_inv_itens_inv ON public.estoque_inventario_itens(inventario_id);

-- --- saldos ---
CREATE TABLE public.estoque_saldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  localizacao_id uuid NOT NULL REFERENCES public.localizacoes_estoque(id),
  quantidade numeric(15,4) NOT NULL DEFAULT 0,
  custo_medio numeric(15,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_representada_id, produto_id, localizacao_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_saldos TO authenticated;
GRANT ALL ON public.estoque_saldos TO service_role;
ALTER TABLE public.estoque_saldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_saldos_select" ON public.estoque_saldos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "estoque_saldos_write" ON public.estoque_saldos FOR ALL TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_estoque_saldos_prod ON public.estoque_saldos(produto_id, localizacao_id);

-- --- histórico ---
CREATE TABLE public.historico_estoque_movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL,
  movimentacao_id uuid NOT NULL,
  acao varchar(10) NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid,
  ip_origem inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.historico_estoque_movimentacoes TO authenticated;
GRANT ALL ON public.historico_estoque_movimentacoes TO service_role;
ALTER TABLE public.historico_estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hist_estoque_select" ON public.historico_estoque_movimentacoes FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_hist_estoque_mov ON public.historico_estoque_movimentacoes(movimentacao_id, created_at DESC);

-- =========================
-- 2) TRIGGERS updated_at
-- =========================
CREATE TRIGGER trg_estoque_mov_updated BEFORE UPDATE ON public.estoque_movimentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_inv_updated BEFORE UPDATE ON public.estoque_inventarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_estoque_inv_itens_updated BEFORE UPDATE ON public.estoque_inventario_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3) FUNÇÕES / TRIGGERS DE SALDO
-- =========================
CREATE OR REPLACE FUNCTION public.recalc_saldo_estoque(p_empresa uuid, p_produto uuid, p_localizacao uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qtd numeric(15,4);
  v_custo numeric(15,4);
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN tipo IN ('ENTRADA','AJUSTE_POSITIVO','INVENTARIO') AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo IN ('SAIDA','AJUSTE_NEGATIVO') AND localizacao_origem_id = p_localizacao THEN -quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_destino_id = p_localizacao THEN quantidade
      WHEN tipo = 'TRANSFERENCIA' AND localizacao_origem_id = p_localizacao THEN -quantidade
      ELSE 0
    END
  ),0)
  INTO v_qtd
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND (localizacao_origem_id = p_localizacao OR localizacao_destino_id = p_localizacao);

  SELECT COALESCE(AVG(NULLIF(custo_unitario,0)),0) INTO v_custo
  FROM public.estoque_movimentacoes
  WHERE empresa_representada_id = p_empresa
    AND produto_id = p_produto
    AND deleted_at IS NULL
    AND tipo IN ('ENTRADA','AJUSTE_POSITIVO')
    AND localizacao_destino_id = p_localizacao;

  INSERT INTO public.estoque_saldos (empresa_representada_id, produto_id, localizacao_id, quantidade, custo_medio, updated_at)
  VALUES (p_empresa, p_produto, p_localizacao, v_qtd, v_custo, now())
  ON CONFLICT (empresa_representada_id, produto_id, localizacao_id)
  DO UPDATE SET quantidade = EXCLUDED.quantidade, custo_medio = EXCLUDED.custo_medio, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_estoque_mov_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locs uuid[];
  v_loc uuid;
BEGIN
  v_locs := ARRAY[]::uuid[];
  IF NEW.localizacao_origem_id IS NOT NULL THEN v_locs := v_locs || NEW.localizacao_origem_id; END IF;
  IF NEW.localizacao_destino_id IS NOT NULL THEN v_locs := v_locs || NEW.localizacao_destino_id; END IF;
  IF TG_OP <> 'INSERT' THEN
    IF OLD.localizacao_origem_id IS NOT NULL AND NOT (OLD.localizacao_origem_id = ANY(v_locs)) THEN
      v_locs := v_locs || OLD.localizacao_origem_id;
    END IF;
    IF OLD.localizacao_destino_id IS NOT NULL AND NOT (OLD.localizacao_destino_id = ANY(v_locs)) THEN
      v_locs := v_locs || OLD.localizacao_destino_id;
    END IF;
  END IF;

  FOREACH v_loc IN ARRAY v_locs LOOP
    PERFORM public.recalc_saldo_estoque(
      COALESCE(NEW.empresa_representada_id, OLD.empresa_representada_id),
      COALESCE(NEW.produto_id, OLD.produto_id),
      v_loc
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_estoque_mov_saldo
AFTER INSERT OR UPDATE OR DELETE ON public.estoque_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_mov_recalc();

-- Validação de saldo antes de gravar saída/transferência
CREATE OR REPLACE FUNCTION public.trg_estoque_mov_validar_saldo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo numeric(15,4);
  v_loc uuid;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.tipo IN ('SAIDA','AJUSTE_NEGATIVO','TRANSFERENCIA') THEN
    v_loc := NEW.localizacao_origem_id;
    SELECT COALESCE(quantidade,0) INTO v_saldo
    FROM public.estoque_saldos
    WHERE empresa_representada_id = NEW.empresa_representada_id
      AND produto_id = NEW.produto_id
      AND localizacao_id = v_loc;
    IF COALESCE(v_saldo,0) < NEW.quantidade THEN
      RAISE EXCEPTION 'SALDO_INSUFICIENTE: produto % localização % saldo % < solicitado %',
        NEW.produto_id, v_loc, COALESCE(v_saldo,0), NEW.quantidade USING ERRCODE='P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_estoque_mov_validar_saldo_before
BEFORE INSERT ON public.estoque_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.trg_estoque_mov_validar_saldo();

-- Trigger de auditoria
CREATE OR REPLACE FUNCTION public.registrar_historico_estoque()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.historico_estoque_movimentacoes (
    empresa_representada_id, movimentacao_id, acao, dados_anteriores, dados_novos, usuario_id
  ) VALUES (
    COALESCE(NEW.empresa_representada_id, OLD.empresa_representada_id),
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_estoque_mov_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.estoque_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_estoque();

-- =========================
-- 4) RPCs
-- =========================
CREATE OR REPLACE FUNCTION public.validar_saldo_estoque(p_produto uuid, p_localizacao uuid, p_quantidade numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_saldo numeric(15,4); v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT empresa_representada_id INTO v_empresa FROM public.produtos WHERE id = p_produto;
  IF v_empresa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'produto_nao_encontrado');
  END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND NOT public.user_has_access_to_empresa(v_empresa) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(quantidade,0) INTO v_saldo
  FROM public.estoque_saldos
  WHERE produto_id = p_produto AND localizacao_id = p_localizacao;
  RETURN jsonb_build_object(
    'ok', COALESCE(v_saldo,0) >= p_quantidade,
    'saldo_atual', COALESCE(v_saldo,0),
    'quantidade_solicitada', p_quantidade
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.baixar_estoque_venda(p_venda_id uuid, p_localizacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venda record;
  v_item record;
  v_baixados int := 0;
  v_ja_baixados int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'VENDA_NAO_ENCONTRADA' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND NOT public.user_has_access_to_empresa(v_venda.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;

  FOR v_item IN
    SELECT iv.produto_id, SUM(iv.quantidade) AS qtd
    FROM public.itens_venda iv
    JOIN public.produtos p ON p.id = iv.produto_id
    WHERE iv.venda_id = p_venda_id
      AND iv.produto_id IS NOT NULL
      AND p.controla_estoque = true
    GROUP BY iv.produto_id
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.estoque_movimentacoes
      WHERE venda_id = p_venda_id AND produto_id = v_item.produto_id
        AND tipo = 'SAIDA' AND deleted_at IS NULL
    ) THEN
      v_ja_baixados := v_ja_baixados + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      localizacao_origem_id, venda_id, documento_ref, created_by
    ) VALUES (
      v_venda.empresa_representada_id, v_item.produto_id, 'SAIDA', v_item.qtd,
      p_localizacao_id, p_venda_id, v_venda.numero_venda, auth.uid()
    );
    v_baixados := v_baixados + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'baixados', v_baixados, 'ja_baixados', v_ja_baixados);
END;
$$;

CREATE OR REPLACE FUNCTION public.estornar_estoque_venda(p_venda_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov record;
  v_estornados int := 0;
  v_empresa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT empresa_representada_id INTO v_empresa FROM public.vendas WHERE id = p_venda_id;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'VENDA_NAO_ENCONTRADA' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND NOT public.user_has_access_to_empresa(v_empresa) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;

  FOR v_mov IN
    SELECT * FROM public.estoque_movimentacoes
    WHERE venda_id = p_venda_id AND tipo = 'SAIDA' AND deleted_at IS NULL
  LOOP
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      localizacao_destino_id, venda_id, documento_ref, observacoes, created_by
    ) VALUES (
      v_mov.empresa_representada_id, v_mov.produto_id, 'ENTRADA', v_mov.quantidade,
      v_mov.localizacao_origem_id, p_venda_id,
      'ESTORNO:' || COALESCE(v_mov.documento_ref,''),
      'Estorno da saída ' || v_mov.id::text, auth.uid()
    );
    UPDATE public.estoque_movimentacoes SET deleted_at = now() WHERE id = v_mov.id;
    v_estornados := v_estornados + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'estornados', v_estornados);
END;
$$;

CREATE OR REPLACE FUNCTION public.conciliar_inventario(p_inventario_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
  v_it record;
  v_gerados int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_inv FROM public.estoque_inventarios WHERE id = p_inventario_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVENTARIO_NAO_ENCONTRADO' USING ERRCODE='P0001'; END IF;
  IF NOT public.has_role(auth.uid(),'admin') AND NOT public.user_has_access_to_empresa(v_inv.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;
  IF v_inv.status = 'CONCILIADO' THEN
    RETURN jsonb_build_object('ok', true, 'gerados', 0, 'replay', true);
  END IF;
  IF v_inv.localizacao_id IS NULL THEN
    RAISE EXCEPTION 'INVENTARIO_SEM_LOCALIZACAO' USING ERRCODE='P0001';
  END IF;

  FOR v_it IN
    SELECT * FROM public.estoque_inventario_itens WHERE inventario_id = p_inventario_id AND diferenca <> 0
  LOOP
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade,
      custo_unitario, localizacao_origem_id, localizacao_destino_id,
      inventario_id, documento_ref, observacoes, created_by
    ) VALUES (
      v_inv.empresa_representada_id, v_it.produto_id,
      CASE WHEN v_it.diferenca > 0 THEN 'AJUSTE_POSITIVO' ELSE 'AJUSTE_NEGATIVO' END,
      abs(v_it.diferenca),
      v_it.custo_unitario,
      CASE WHEN v_it.diferenca < 0 THEN v_inv.localizacao_id END,
      CASE WHEN v_it.diferenca > 0 THEN v_inv.localizacao_id END,
      p_inventario_id, v_inv.codigo,
      'Ajuste de inventário',
      auth.uid()
    );
    v_gerados := v_gerados + 1;
  END LOOP;

  UPDATE public.estoque_inventarios
     SET status='CONCILIADO', data_fim = now(), updated_at = now()
   WHERE id = p_inventario_id;

  RETURN jsonb_build_object('ok', true, 'gerados', v_gerados, 'replay', false);
END;
$$;
