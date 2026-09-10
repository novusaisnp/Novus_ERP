-- PROD-1: Produção Leve — ficha técnica (BOM) simples, ordem de fabricação que consome
-- Estoque e gera produto acabado, apontamento de consumo × planejado e custo médio de
-- produção. Onda 1 do Mapa Mestre de Capacidades (docs/PLANO_MESTRE.md, Parte 3, item 8).
--
-- Reaproveita a infraestrutura de Estoque já madura (P12): toda entrada/saída nasce como
-- linha real em estoque_movimentacoes, e o saldo/custo médio por localização é recalculado
-- pelo trigger existente (trg_estoque_mov_recalc) — esta migration não duplica essa lógica.
--
-- Fora de escopo desta passada (gaps conhecidos, a registrar em docs/STATUS.md):
-- MRP/explosão de múltiplos níveis de BOM (PROD-2, Onda 3); apontamento de mão de obra/hora
-- máquina (só custo de insumo entra no custo de produção por ora); reversão contábil/de
-- estoque de uma ordem já concluída (só é possível cancelar em RASCUNHO, antes de qualquer
-- consumo — mesmo gap já documentado para cancelamento de título no FIN-4).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Novas contas no plano mínimo (estende o seed do FIN-4/ATV-1, não recria)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.seed_plano_contas_producao(p_empresa_id uuid)
RETURNS TABLE(
  estoque_materia_prima_id uuid,
  estoque_produtos_acabados_id uuid
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ativo_circulante_id uuid;
  v_estoques_id uuid;
  v_materia_prima_id uuid;
  v_produtos_acabados_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.1.3') THEN
    SELECT id INTO v_materia_prima_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.1.3.1';
    SELECT id INTO v_produtos_acabados_id FROM public.plano_contas WHERE empresa_representada_id = p_empresa_id AND codigo = '3.1.3.2';
    estoque_materia_prima_id := v_materia_prima_id;
    estoque_produtos_acabados_id := v_produtos_acabados_id;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT id INTO v_ativo_circulante_id FROM public.plano_contas
    WHERE empresa_representada_id = p_empresa_id AND codigo = '3.1';

  IF v_ativo_circulante_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1.3', 'Estoques', 'ATIVO', 3, v_ativo_circulante_id, false)
    RETURNING id INTO v_estoques_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1.3.1', 'Matéria-Prima e Insumos', 'ATIVO', 4, v_estoques_id, true)
    RETURNING id INTO v_materia_prima_id;
  INSERT INTO public.plano_contas (empresa_representada_id, codigo, nome, tipo, nivel, conta_pai_id, aceita_lancamento)
    VALUES (p_empresa_id, '3.1.3.2', 'Produtos Acabados', 'ATIVO', 4, v_estoques_id, true)
    RETURNING id INTO v_produtos_acabados_id;

  estoque_materia_prima_id := v_materia_prima_id;
  estoque_produtos_acabados_id := v_produtos_acabados_id;
  RETURN NEXT;
END;
$$;

ALTER TABLE public.empresas_representadas
  ADD COLUMN plano_conta_estoque_materia_prima_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN plano_conta_estoque_produtos_acabados_default_id uuid REFERENCES public.plano_contas(id);

DO $$
DECLARE
  v_empresa record;
  v_seed record;
BEGIN
  FOR v_empresa IN SELECT id FROM public.empresas_representadas LOOP
    SELECT * INTO v_seed FROM public.seed_plano_contas_producao(v_empresa.id);
    IF v_seed.estoque_materia_prima_id IS NOT NULL THEN
      UPDATE public.empresas_representadas
      SET plano_conta_estoque_materia_prima_default_id = v_seed.estoque_materia_prima_id,
          plano_conta_estoque_produtos_acabados_default_id = v_seed.estoque_produtos_acabados_id
      WHERE id = v_empresa.id;
    END IF;
  END LOOP;
END $$;

-- Estende (não recria) o trigger de empresa nova do FIN-4/ATV-1 pra semear também as
-- contas de estoque — CREATE OR REPLACE na mesma função já existente.
CREATE OR REPLACE FUNCTION public.seed_plano_contas_nova_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seed record;
  v_seed_atv record;
  v_seed_prod record;
BEGIN
  SELECT * INTO v_seed FROM public.seed_plano_contas_minimo(NEW.id);
  SELECT * INTO v_seed_atv FROM public.seed_plano_contas_ativo_fixo(NEW.id);
  SELECT * INTO v_seed_prod FROM public.seed_plano_contas_producao(NEW.id);
  UPDATE public.empresas_representadas
  SET plano_conta_caixa_bancos_default_id = v_seed.caixa_bancos_id,
      plano_conta_contas_receber_default_id = v_seed.contas_receber_id,
      plano_conta_contas_pagar_default_id = v_seed.contas_pagar_id,
      plano_conta_imobilizado_default_id = v_seed_atv.imobilizado_id,
      plano_conta_depreciacao_acumulada_default_id = v_seed_atv.depreciacao_acumulada_id,
      plano_conta_despesa_depreciacao_default_id = v_seed_atv.despesa_depreciacao_id,
      plano_conta_resultado_baixa_ativo_default_id = v_seed_atv.resultado_baixa_id,
      plano_conta_estoque_materia_prima_default_id = v_seed_prod.estoque_materia_prima_id,
      plano_conta_estoque_produtos_acabados_default_id = v_seed_prod.estoque_produtos_acabados_id
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seed_plano_contas_producao(uuid) FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Ficha técnica (BOM) — cabeçalho + itens
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.fichas_tecnicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  nome varchar NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Só uma ficha técnica ativa por produto acabado — evita ambiguidade de qual BOM usar
-- ao abrir uma ordem de fabricação sem precisar de tela de seleção adicional.
CREATE UNIQUE INDEX uq_fichas_tecnicas_produto_ativa
  ON public.fichas_tecnicas(empresa_representada_id, produto_id)
  WHERE ativo;

CREATE INDEX idx_fichas_tecnicas_empresa ON public.fichas_tecnicas(empresa_representada_id);

CREATE TRIGGER trg_fichas_tecnicas_updated
  BEFORE UPDATE ON public.fichas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fichas_tecnicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY fichas_tecnicas_select ON public.fichas_tecnicas
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY fichas_tecnicas_insert ON public.fichas_tecnicas
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY fichas_tecnicas_update ON public.fichas_tecnicas
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE TABLE public.fichas_tecnicas_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
  produto_insumo_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric(15,4) NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ficha_tecnica_id, produto_insumo_id)
);

CREATE INDEX idx_fichas_tecnicas_itens_ficha ON public.fichas_tecnicas_itens(ficha_tecnica_id);

-- Um produto não pode ser insumo de si mesmo (BOM circular de 1 nível).
CREATE OR REPLACE FUNCTION public.validar_item_ficha_tecnica()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_produto_acabado_id uuid;
BEGIN
  SELECT produto_id INTO v_produto_acabado_id FROM public.fichas_tecnicas WHERE id = NEW.ficha_tecnica_id;
  IF v_produto_acabado_id = NEW.produto_insumo_id THEN
    RAISE EXCEPTION 'Um produto não pode ser insumo de sua própria ficha técnica' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fichas_tecnicas_itens_validar
  BEFORE INSERT OR UPDATE ON public.fichas_tecnicas_itens
  FOR EACH ROW EXECUTE FUNCTION public.validar_item_ficha_tecnica();

ALTER TABLE public.fichas_tecnicas_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY fichas_tecnicas_itens_select ON public.fichas_tecnicas_itens
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY fichas_tecnicas_itens_insert ON public.fichas_tecnicas_itens
  FOR INSERT
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY fichas_tecnicas_itens_update ON public.fichas_tecnicas_itens
  FOR UPDATE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
  WITH CHECK (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

CREATE POLICY fichas_tecnicas_itens_delete ON public.fichas_tecnicas_itens
  FOR DELETE
  USING (public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id));

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Ordem de fabricação — cabeçalho + apontamento de consumo × planejado
--    Escritas exclusivamente via RPC (SECURITY DEFINER) abaixo: sem policy de
--    INSERT/UPDATE/DELETE direta, mesmo padrão de lancamentos_contabeis (FIN-4).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.ordens_fabricacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  ficha_tecnica_id uuid NOT NULL REFERENCES public.fichas_tecnicas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade_planejada numeric(15,4) NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_produzida numeric(15,4),
  localizacao_consumo_id uuid NOT NULL REFERENCES public.localizacoes_estoque(id),
  localizacao_producao_id uuid NOT NULL REFERENCES public.localizacoes_estoque(id),
  status varchar(20) NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CONCLUIDA','CANCELADA')),
  custo_total_producao numeric(15,4),
  custo_unitario_producao numeric(15,4),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_conclusao timestamptz,
  motivo_cancelamento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ordens_fabricacao_empresa ON public.ordens_fabricacao(empresa_representada_id, data_abertura DESC);
CREATE INDEX idx_ordens_fabricacao_status ON public.ordens_fabricacao(empresa_representada_id, status);
CREATE INDEX idx_ordens_fabricacao_produto ON public.ordens_fabricacao(produto_id);

CREATE TRIGGER trg_ordens_fabricacao_updated
  BEFORE UPDATE ON public.ordens_fabricacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ordens_fabricacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordens_fabricacao_select ON public.ordens_fabricacao
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE TABLE public.ordens_fabricacao_consumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  ordem_id uuid NOT NULL REFERENCES public.ordens_fabricacao(id) ON DELETE CASCADE,
  produto_insumo_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade_planejada numeric(15,4) NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_consumida numeric(15,4),
  custo_unitario numeric(15,4),
  estoque_movimentacao_id uuid REFERENCES public.estoque_movimentacoes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ordem_id, produto_insumo_id)
);

CREATE INDEX idx_ordens_fabricacao_consumos_ordem ON public.ordens_fabricacao_consumos(ordem_id);

ALTER TABLE public.ordens_fabricacao_consumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY ordens_fabricacao_consumos_select ON public.ordens_fabricacao_consumos
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPCs — abrir, concluir e cancelar ordem de fabricação
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.criar_ordem_fabricacao(
  p_empresa_id uuid,
  p_ficha_tecnica_id uuid,
  p_quantidade_planejada numeric,
  p_localizacao_consumo_id uuid,
  p_localizacao_producao_id uuid,
  p_centro_custo_id uuid DEFAULT NULL,
  p_observacoes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ficha record;
  v_ordem_id uuid;
  v_item record;
  v_tem_itens boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role_for_empresa(auth.uid(), 'admin', p_empresa_id) THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF p_quantidade_planejada IS NULL OR p_quantidade_planejada <= 0 THEN
    RAISE EXCEPTION 'Quantidade planejada invalida';
  END IF;

  SELECT * INTO v_ficha FROM public.fichas_tecnicas
    WHERE id = p_ficha_tecnica_id AND empresa_representada_id = p_empresa_id AND ativo;
  IF v_ficha IS NULL THEN
    RAISE EXCEPTION 'FICHA_TECNICA_INVALIDA' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.localizacoes_estoque WHERE id = p_localizacao_consumo_id AND empresa_representada_id = p_empresa_id) THEN
    RAISE EXCEPTION 'LOCALIZACAO_CONSUMO_INVALIDA' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.localizacoes_estoque WHERE id = p_localizacao_producao_id AND empresa_representada_id = p_empresa_id) THEN
    RAISE EXCEPTION 'LOCALIZACAO_PRODUCAO_INVALIDA' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.ordens_fabricacao (
    empresa_representada_id, ficha_tecnica_id, produto_id, quantidade_planejada,
    localizacao_consumo_id, localizacao_producao_id, centro_custo_id, observacoes, created_by
  ) VALUES (
    p_empresa_id, p_ficha_tecnica_id, v_ficha.produto_id, p_quantidade_planejada,
    p_localizacao_consumo_id, p_localizacao_producao_id, p_centro_custo_id, p_observacoes, auth.uid()
  ) RETURNING id INTO v_ordem_id;

  FOR v_item IN SELECT * FROM public.fichas_tecnicas_itens WHERE ficha_tecnica_id = p_ficha_tecnica_id LOOP
    v_tem_itens := true;
    INSERT INTO public.ordens_fabricacao_consumos (
      empresa_representada_id, ordem_id, produto_insumo_id, quantidade_planejada
    ) VALUES (
      p_empresa_id, v_ordem_id, v_item.produto_insumo_id, v_item.quantidade * p_quantidade_planejada
    );
  END LOOP;

  IF NOT v_tem_itens THEN
    RAISE EXCEPTION 'FICHA_SEM_ITENS' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_ordem_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_ordem_fabricacao(uuid, uuid, numeric, uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.criar_ordem_fabricacao(uuid, uuid, numeric, uuid, uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.concluir_ordem_fabricacao(
  p_ordem_id uuid,
  p_quantidade_produzida numeric,
  p_consumos jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordem record;
  v_consumo record;
  v_override jsonb;
  v_qtd_consumida numeric;
  v_custo_medio numeric;
  v_mov_id uuid;
  v_mov_produzido_id uuid;
  v_custo_total numeric := 0;
  v_custo_unitario_producao numeric;
  v_conta_mp_id uuid;
  v_conta_pa_id uuid;
  v_lancamento_id uuid;
  v_doc_ref varchar;
  v_ficha_nome varchar;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_quantidade_produzida IS NULL OR p_quantidade_produzida <= 0 THEN
    RAISE EXCEPTION 'Quantidade produzida invalida';
  END IF;

  SELECT * INTO v_ordem FROM public.ordens_fabricacao WHERE id = p_ordem_id FOR UPDATE;
  IF v_ordem IS NULL THEN
    RAISE EXCEPTION 'Ordem de fabricacao nao encontrada';
  END IF;
  IF NOT public.has_role_for_empresa(auth.uid(), 'admin', v_ordem.empresa_representada_id) THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_ordem.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'ORDEM_JA_FINALIZADA' USING ERRCODE = 'P0001';
  END IF;

  v_doc_ref := CONCAT('OF-', substring(p_ordem_id::text, 1, 8));
  SELECT nome INTO v_ficha_nome FROM public.fichas_tecnicas WHERE id = v_ordem.ficha_tecnica_id;

  FOR v_consumo IN SELECT * FROM public.ordens_fabricacao_consumos WHERE ordem_id = p_ordem_id LOOP
    v_qtd_consumida := v_consumo.quantidade_planejada;
    IF p_consumos IS NOT NULL THEN
      FOR v_override IN SELECT * FROM jsonb_array_elements(p_consumos) LOOP
        IF (v_override->>'produto_insumo_id')::uuid = v_consumo.produto_insumo_id THEN
          v_qtd_consumida := (v_override->>'quantidade_consumida')::numeric;
        END IF;
      END LOOP;
    END IF;

    IF v_qtd_consumida IS NULL OR v_qtd_consumida < 0 THEN
      RAISE EXCEPTION 'QUANTIDADE_CONSUMIDA_INVALIDA' USING ERRCODE = 'P0001';
    END IF;

    v_mov_id := NULL;
    v_custo_medio := 0;

    IF v_qtd_consumida > 0 THEN
      SELECT COALESCE(custo_medio, 0) INTO v_custo_medio
        FROM public.estoque_saldos
        WHERE empresa_representada_id = v_ordem.empresa_representada_id
          AND produto_id = v_consumo.produto_insumo_id
          AND localizacao_id = v_ordem.localizacao_consumo_id;

      -- Insere a SAIDA real: trg_estoque_mov_validar_saldo (infra existente do módulo de
      -- Estoque) já bloqueia se o saldo na localização for insuficiente, sem duplicar a
      -- checagem aqui.
      INSERT INTO public.estoque_movimentacoes (
        empresa_representada_id, produto_id, tipo, quantidade, custo_unitario,
        localizacao_origem_id, documento_ref, observacoes, created_by
      ) VALUES (
        v_ordem.empresa_representada_id, v_consumo.produto_insumo_id, 'SAIDA', v_qtd_consumida, v_custo_medio,
        v_ordem.localizacao_consumo_id, v_doc_ref, CONCAT('Consumo — ordem de fabricação ', v_doc_ref), auth.uid()
      ) RETURNING id INTO v_mov_id;

      v_custo_total := v_custo_total + (v_qtd_consumida * v_custo_medio);
    END IF;

    UPDATE public.ordens_fabricacao_consumos
      SET quantidade_consumida = v_qtd_consumida, custo_unitario = v_custo_medio, estoque_movimentacao_id = v_mov_id
      WHERE id = v_consumo.id;
  END LOOP;

  v_custo_unitario_producao := ROUND(v_custo_total / p_quantidade_produzida, 4);

  INSERT INTO public.estoque_movimentacoes (
    empresa_representada_id, produto_id, tipo, quantidade, custo_unitario,
    localizacao_destino_id, documento_ref, observacoes, created_by
  ) VALUES (
    v_ordem.empresa_representada_id, v_ordem.produto_id, 'ENTRADA', p_quantidade_produzida, v_custo_unitario_producao,
    v_ordem.localizacao_producao_id, v_doc_ref, CONCAT('Produção — ordem de fabricação ', v_doc_ref), auth.uid()
  ) RETURNING id INTO v_mov_produzido_id;

  UPDATE public.ordens_fabricacao
    SET status = 'CONCLUIDA', quantidade_produzida = p_quantidade_produzida,
        custo_total_producao = v_custo_total, custo_unitario_producao = v_custo_unitario_producao,
        data_conclusao = now()
    WHERE id = p_ordem_id;

  -- Lançamento contábil: reclassificação interna dentro de Estoques (Débito Produtos
  -- Acabados / Crédito Matéria-Prima e Insumos), sempre balanceada pelo próprio v_custo_total.
  -- Se a empresa nao tiver as contas configuradas (gap conhecido, mesma convenção de
  -- lancar_titulo_criado), a ordem segue concluida sem lançamento.
  SELECT plano_conta_estoque_materia_prima_default_id, plano_conta_estoque_produtos_acabados_default_id
    INTO v_conta_mp_id, v_conta_pa_id
  FROM public.empresas_representadas WHERE id = v_ordem.empresa_representada_id;

  IF v_conta_mp_id IS NOT NULL AND v_conta_pa_id IS NOT NULL AND v_custo_total > 0 THEN
    INSERT INTO public.lancamentos_contabeis (
      empresa_representada_id, data_lancamento, data_competencia, historico,
      origem_tipo, origem_tabela, origem_id, idempotency_key
    ) VALUES (
      v_ordem.empresa_representada_id, CURRENT_DATE, CURRENT_DATE,
      CONCAT('Produção — ', COALESCE(v_ficha_nome, v_doc_ref), ' (', p_quantidade_produzida, ' un.)'),
      'MANUAL', 'ordens_fabricacao', p_ordem_id, CONCAT(p_ordem_id::text, '-producao')
    ) RETURNING id INTO v_lancamento_id;

    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_pa_id, 'DEBITO', v_custo_total, v_ordem.centro_custo_id);
    INSERT INTO public.lancamentos_contabeis_itens (lancamento_id, conta_contabil_id, tipo_partida, valor, centro_custo_id)
      VALUES (v_lancamento_id, v_conta_mp_id, 'CREDITO', v_custo_total, v_ordem.centro_custo_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'ordem_id', p_ordem_id, 'quantidade_produzida', p_quantidade_produzida,
    'custo_total_producao', v_custo_total, 'custo_unitario_producao', v_custo_unitario_producao,
    'lancamento_id', v_lancamento_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.concluir_ordem_fabricacao(uuid, numeric, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.concluir_ordem_fabricacao(uuid, numeric, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancelar_ordem_fabricacao(p_ordem_id uuid, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordem record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Motivo do cancelamento e obrigatorio (minimo 5 caracteres)';
  END IF;

  SELECT * INTO v_ordem FROM public.ordens_fabricacao WHERE id = p_ordem_id FOR UPDATE;
  IF v_ordem IS NULL THEN
    RAISE EXCEPTION 'Ordem de fabricacao nao encontrada';
  END IF;
  IF NOT public.has_role_for_empresa(auth.uid(), 'admin', v_ordem.empresa_representada_id) THEN
    RAISE EXCEPTION 'Acesso negado para a empresa' USING ERRCODE = '42501';
  END IF;
  IF v_ordem.status <> 'RASCUNHO' THEN
    -- Nada foi consumido/produzido ainda em RASCUNHO — cancelar é só virar status, sem
    -- estorno de estoque/contábil a fazer. Uma ordem CONCLUIDA não pode ser cancelada por
    -- aqui (gap documentado no cabeçalho desta migration).
    RAISE EXCEPTION 'ORDEM_NAO_PODE_SER_CANCELADA' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.ordens_fabricacao
    SET status = 'CANCELADA', motivo_cancelamento = p_motivo
    WHERE id = p_ordem_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancelar_ordem_fabricacao(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_ordem_fabricacao(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.criar_ordem_fabricacao(uuid, uuid, numeric, uuid, uuid, uuid, text) IS
  'PROD-1: abre uma ordem de fabricação em RASCUNHO a partir de uma ficha técnica ativa, copiando os itens (quantidade planejada = quantidade da ficha × quantidade planejada da ordem) para ordens_fabricacao_consumos.';
COMMENT ON FUNCTION public.concluir_ordem_fabricacao(uuid, numeric, jsonb) IS
  'PROD-1: consome os insumos (SAIDA real em estoque_movimentacoes, custo pelo custo médio atual na localização de consumo), gera o produto acabado (ENTRADA pelo custo médio de produção = custo total consumido / quantidade produzida) e lança Débito Produtos Acabados / Crédito Matéria-Prima quando a empresa tiver as contas configuradas. p_consumos permite apontar quantidade real diferente da planejada por insumo: [{"produto_insumo_id":"...","quantidade_consumida":0}].';
COMMENT ON FUNCTION public.cancelar_ordem_fabricacao(uuid, text) IS
  'PROD-1: cancela uma ordem de fabricação, só permitido enquanto RASCUNHO (antes de qualquer consumo/produção real).';
