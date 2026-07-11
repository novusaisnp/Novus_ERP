
-- =========================================================
-- ACC-R2: CLASSIFICAÇÃO CONTÁBIL DE RECEITA
-- =========================================================

-- 1) naturezas_receita
CREATE TABLE public.naturezas_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  codigo varchar(50) NOT NULL,
  nome varchar(255) NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_representada_id, codigo)
);
CREATE INDEX idx_nat_rec_empresa ON public.naturezas_receita(empresa_representada_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.naturezas_receita TO authenticated;
GRANT ALL ON public.naturezas_receita TO service_role;
ALTER TABLE public.naturezas_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY nat_rec_select ON public.naturezas_receita FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY nat_rec_insert ON public.naturezas_receita FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY nat_rec_update ON public.naturezas_receita FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY nat_rec_delete ON public.naturezas_receita FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_nat_rec_upd BEFORE UPDATE ON public.naturezas_receita
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2) regras_classificacao_receita
CREATE TABLE public.regras_classificacao_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  alvo_tipo varchar(20) NOT NULL CHECK (alvo_tipo IN ('PRODUTO','SERVICO','CONTRATO','CATEGORIA','TIPO','EMPRESA')),
  alvo_id uuid,                       -- id do produto/servico/contrato/categoria; null p/ TIPO ou EMPRESA
  tipo_item char(1) CHECK (tipo_item IN ('P','S','C')),
  categoria_id uuid REFERENCES public.categorias_produtos(id),
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  natureza_receita_id uuid REFERENCES public.naturezas_receita(id),
  prioridade int NOT NULL DEFAULT 100,
  versao int NOT NULL DEFAULT 1,
  vigencia_ini date,
  vigencia_fim date,
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rcr_empresa ON public.regras_classificacao_receita(empresa_representada_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rcr_alvo ON public.regras_classificacao_receita(alvo_tipo, alvo_id) WHERE deleted_at IS NULL AND ativo = true;
CREATE INDEX idx_rcr_categoria ON public.regras_classificacao_receita(categoria_id) WHERE deleted_at IS NULL AND ativo = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.regras_classificacao_receita TO authenticated;
GRANT ALL ON public.regras_classificacao_receita TO service_role;
ALTER TABLE public.regras_classificacao_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY rcr_select ON public.regras_classificacao_receita FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY rcr_insert ON public.regras_classificacao_receita FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY rcr_update ON public.regras_classificacao_receita FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY rcr_delete ON public.regras_classificacao_receita FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_rcr_upd BEFORE UPDATE ON public.regras_classificacao_receita
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3) defaults contábeis em cadastros (nullable)
ALTER TABLE public.produtos
  ADD COLUMN plano_conta_receita_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_id uuid REFERENCES public.naturezas_receita(id);

ALTER TABLE public.servicos
  ADD COLUMN plano_conta_receita_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_id uuid REFERENCES public.naturezas_receita(id);

ALTER TABLE public.contratos
  ADD COLUMN plano_conta_receita_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_id uuid REFERENCES public.naturezas_receita(id);

ALTER TABLE public.categorias_produtos
  ADD COLUMN plano_conta_receita_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_id uuid REFERENCES public.naturezas_receita(id);

ALTER TABLE public.empresas_representadas
  ADD COLUMN plano_conta_receita_default_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_default_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_default_id uuid REFERENCES public.naturezas_receita(id);


-- 4) snapshot em itens_venda
ALTER TABLE public.itens_venda
  ADD COLUMN plano_conta_id uuid REFERENCES public.plano_contas(id),
  ADD COLUMN centro_custo_id uuid REFERENCES public.centros_custo(id),
  ADD COLUMN natureza_receita_id uuid REFERENCES public.naturezas_receita(id),
  ADD COLUMN regra_origem varchar(30),
  ADD COLUMN regra_versao int,
  ADD COLUMN hash_classificacao text;


-- 5) venda_parcela_classificacao_receita (rateio por parcela)
CREATE TABLE public.venda_parcela_classificacao_receita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  venda_pagamento_parcela_id uuid NOT NULL REFERENCES public.venda_pagamento_parcelas(id) ON DELETE CASCADE,
  plano_conta_id uuid NOT NULL REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  natureza_receita_id uuid REFERENCES public.naturezas_receita(id),
  valor_rateado numeric(15,2) NOT NULL CHECK (valor_rateado >= 0),
  pct_rateado numeric(9,6) NOT NULL CHECK (pct_rateado >= 0 AND pct_rateado <= 1),
  regra_origem varchar(30) NOT NULL,
  regra_versao int NOT NULL DEFAULT 1,
  hash_classificacao text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_vpcr_parcela_hash
  ON public.venda_parcela_classificacao_receita (venda_pagamento_parcela_id, hash_classificacao);
CREATE INDEX idx_vpcr_empresa ON public.venda_parcela_classificacao_receita(empresa_representada_id);
CREATE INDEX idx_vpcr_parcela ON public.venda_parcela_classificacao_receita(venda_pagamento_parcela_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venda_parcela_classificacao_receita TO authenticated;
GRANT ALL ON public.venda_parcela_classificacao_receita TO service_role;
ALTER TABLE public.venda_parcela_classificacao_receita ENABLE ROW LEVEL SECURITY;

CREATE POLICY vpcr_select ON public.venda_parcela_classificacao_receita FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY vpcr_insert ON public.venda_parcela_classificacao_receita FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY vpcr_update ON public.venda_parcela_classificacao_receita FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY vpcr_delete ON public.venda_parcela_classificacao_receita FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));


-- 6) resolver_classificacao_receita
-- Retorna: plano_conta_id, centro_custo_id, natureza_receita_id, regra_origem, regra_versao, hash_classificacao
CREATE OR REPLACE FUNCTION public.resolver_classificacao_receita(p_item_id uuid)
RETURNS TABLE(
  plano_conta_id uuid,
  centro_custo_id uuid,
  natureza_receita_id uuid,
  regra_origem varchar,
  regra_versao int,
  hash_classificacao text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item          record;
  v_empresa       uuid;
  v_categoria     uuid;
  v_tipo          char(1);
  v_pc uuid; v_cc uuid; v_nr uuid;
  v_origem        varchar(30);
  v_versao        int := 1;
  r               record;
BEGIN
  SELECT iv.*, p.categoria_id AS prod_categoria
    INTO v_item
  FROM public.itens_venda iv
  LEFT JOIN public.produtos p ON p.id = iv.produto_id
  WHERE iv.id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NAO_ENCONTRADO' USING ERRCODE='P0001';
  END IF;

  v_empresa   := v_item.empresa_representada_id;
  v_tipo      := v_item.tipo_item;
  v_categoria := v_item.prod_categoria;

  -- (1) override no item
  IF v_item.plano_conta_id IS NOT NULL THEN
    plano_conta_id := v_item.plano_conta_id;
    centro_custo_id := v_item.centro_custo_id;
    natureza_receita_id := v_item.natureza_receita_id;
    regra_origem := 'ITEM_OVERRIDE';
    regra_versao := 1;
    hash_classificacao := encode(digest(
      coalesce(plano_conta_id::text,'') || '|' || coalesce(centro_custo_id::text,'') || '|' ||
      coalesce(natureza_receita_id::text,'') || '|' || regra_origem || '|' || regra_versao::text, 'sha256'),'hex');
    RETURN NEXT; RETURN;
  END IF;

  -- (2) regra específica por item
  SELECT * INTO r FROM public.regras_classificacao_receita
   WHERE empresa_representada_id = v_empresa AND ativo = true AND deleted_at IS NULL
     AND alvo_tipo IN ('PRODUTO','SERVICO','CONTRATO')
     AND alvo_id = COALESCE(v_item.produto_id, v_item.servico_id)
     AND (vigencia_ini IS NULL OR vigencia_ini <= CURRENT_DATE)
     AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
   ORDER BY prioridade ASC, versao DESC LIMIT 1;
  IF FOUND THEN
    v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
    v_origem := 'REGRA_ITEM'; v_versao := r.versao;
  END IF;

  -- (3) regra por categoria
  IF v_pc IS NULL AND v_categoria IS NOT NULL THEN
    SELECT * INTO r FROM public.regras_classificacao_receita
     WHERE empresa_representada_id = v_empresa AND ativo = true AND deleted_at IS NULL
       AND alvo_tipo = 'CATEGORIA' AND categoria_id = v_categoria
       AND (vigencia_ini IS NULL OR vigencia_ini <= CURRENT_DATE)
       AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
     ORDER BY prioridade ASC, versao DESC LIMIT 1;
    IF FOUND THEN
      v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
      v_origem := 'REGRA_CATEGORIA'; v_versao := r.versao;
    END IF;
  END IF;

  -- (4) default do cadastro
  IF v_pc IS NULL THEN
    IF v_item.produto_id IS NOT NULL THEN
      SELECT plano_conta_receita_id, centro_custo_id, natureza_receita_id
        INTO v_pc, v_cc, v_nr FROM public.produtos WHERE id = v_item.produto_id;
    ELSIF v_item.servico_id IS NOT NULL THEN
      SELECT plano_conta_receita_id, centro_custo_id, natureza_receita_id
        INTO v_pc, v_cc, v_nr FROM public.servicos WHERE id = v_item.servico_id;
    END IF;
    IF v_pc IS NOT NULL THEN v_origem := 'CADASTRO_DEFAULT'; v_versao := 1; END IF;
  END IF;

  -- (4b) default da categoria (cadastro)
  IF v_pc IS NULL AND v_categoria IS NOT NULL THEN
    SELECT plano_conta_receita_id, centro_custo_id, natureza_receita_id
      INTO v_pc, v_cc, v_nr FROM public.categorias_produtos WHERE id = v_categoria;
    IF v_pc IS NOT NULL THEN v_origem := 'CATEGORIA_DEFAULT'; v_versao := 1; END IF;
  END IF;

  -- (5) regra por tipo
  IF v_pc IS NULL THEN
    SELECT * INTO r FROM public.regras_classificacao_receita
     WHERE empresa_representada_id = v_empresa AND ativo = true AND deleted_at IS NULL
       AND alvo_tipo = 'TIPO' AND tipo_item = v_tipo
       AND (vigencia_ini IS NULL OR vigencia_ini <= CURRENT_DATE)
       AND (vigencia_fim IS NULL OR vigencia_fim >= CURRENT_DATE)
     ORDER BY prioridade ASC, versao DESC LIMIT 1;
    IF FOUND THEN
      v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
      v_origem := 'REGRA_TIPO'; v_versao := r.versao;
    END IF;
  END IF;

  -- (6) default da empresa
  IF v_pc IS NULL THEN
    SELECT plano_conta_receita_default_id, centro_custo_default_id, natureza_receita_default_id
      INTO v_pc, v_cc, v_nr FROM public.empresas_representadas WHERE id = v_empresa;
    IF v_pc IS NOT NULL THEN v_origem := 'EMPRESA_DEFAULT'; v_versao := 1; END IF;
  END IF;

  -- (7) sem resolução
  IF v_pc IS NULL THEN
    RAISE EXCEPTION 'CLASSIFICACAO_CONTABIL_AUSENTE: item %', p_item_id USING ERRCODE='P0001';
  END IF;

  plano_conta_id := v_pc;
  centro_custo_id := v_cc;
  natureza_receita_id := v_nr;
  regra_origem := v_origem;
  regra_versao := v_versao;
  hash_classificacao := encode(digest(
    coalesce(v_pc::text,'') || '|' || coalesce(v_cc::text,'') || '|' ||
    coalesce(v_nr::text,'') || '|' || v_origem || '|' || v_versao::text, 'sha256'),'hex');
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.resolver_classificacao_receita(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolver_classificacao_receita(uuid) TO authenticated;


-- 7) trigger: ao confirmar venda, popular snapshot + rateio
CREATE OR REPLACE FUNCTION public.snapshot_classificacao_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item        record;
  v_class       record;
  v_parcela     record;
  v_total       numeric(15,2);
  v_pct         numeric(9,6);
  v_valor_rat   numeric(15,2);
BEGIN
  -- só age na transição para CONFIRMADO
  IF NEW.status = 'CONFIRMADO' AND (OLD.status IS DISTINCT FROM 'CONFIRMADO') THEN

    -- resolver e gravar snapshot em cada item
    FOR v_item IN
      SELECT id, valor_total_item FROM public.itens_venda WHERE venda_id = NEW.id
    LOOP
      SELECT * INTO v_class FROM public.resolver_classificacao_receita(v_item.id);
      UPDATE public.itens_venda
         SET plano_conta_id = v_class.plano_conta_id,
             centro_custo_id = v_class.centro_custo_id,
             natureza_receita_id = v_class.natureza_receita_id,
             regra_origem = v_class.regra_origem,
             regra_versao = v_class.regra_versao,
             hash_classificacao = v_class.hash_classificacao
       WHERE id = v_item.id;
    END LOOP;

    -- total base para rateio
    SELECT COALESCE(SUM(valor_total_item),0) INTO v_total
      FROM public.itens_venda WHERE venda_id = NEW.id;

    IF v_total > 0 THEN
      -- para cada parcela, ratear proporcionalmente por classificação (agrupada)
      FOR v_parcela IN
        SELECT vpp.id AS parcela_id, vpp.valor + COALESCE(vpp.valor_juros,0) AS valor_parcela
        FROM public.venda_pagamento vp
        JOIN public.venda_pagamento_parcelas vpp ON vpp.venda_pagamento_id = vp.id
        WHERE vp.venda_id = NEW.id AND vp.deleted_at IS NULL
      LOOP
        -- agrupar itens por hash_classificacao
        INSERT INTO public.venda_parcela_classificacao_receita (
          empresa_representada_id, venda_pagamento_parcela_id,
          plano_conta_id, centro_custo_id, natureza_receita_id,
          valor_rateado, pct_rateado, regra_origem, regra_versao, hash_classificacao, created_by
        )
        SELECT
          NEW.empresa_representada_id,
          v_parcela.parcela_id,
          iv.plano_conta_id, iv.centro_custo_id, iv.natureza_receita_id,
          ROUND(v_parcela.valor_parcela * (SUM(iv.valor_total_item) / v_total), 2),
          ROUND(SUM(iv.valor_total_item) / v_total, 6),
          MIN(iv.regra_origem), MIN(iv.regra_versao), iv.hash_classificacao,
          auth.uid()
        FROM public.itens_venda iv
        WHERE iv.venda_id = NEW.id AND iv.hash_classificacao IS NOT NULL
        GROUP BY iv.hash_classificacao, iv.plano_conta_id, iv.centro_custo_id, iv.natureza_receita_id
        ON CONFLICT (venda_pagamento_parcela_id, hash_classificacao) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.snapshot_classificacao_venda() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_snapshot_class_venda ON public.vendas;
CREATE TRIGGER trg_snapshot_class_venda
  AFTER UPDATE OF status ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_classificacao_venda();
