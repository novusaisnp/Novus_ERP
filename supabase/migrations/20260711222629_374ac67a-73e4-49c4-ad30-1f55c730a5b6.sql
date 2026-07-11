
CREATE OR REPLACE FUNCTION public.resolver_classificacao_receita(p_item_id uuid)
RETURNS TABLE(plano_conta_id uuid, centro_custo_id uuid, natureza_receita_id uuid, regra_origem character varying, regra_versao integer, hash_classificacao text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  SELECT * INTO r FROM public.regras_classificacao_receita rc
   WHERE rc.empresa_representada_id = v_empresa AND rc.ativo = true AND rc.deleted_at IS NULL
     AND rc.alvo_tipo IN ('PRODUTO','SERVICO','CONTRATO')
     AND rc.alvo_id = COALESCE(v_item.produto_id, v_item.servico_id)
     AND (rc.vigencia_ini IS NULL OR rc.vigencia_ini <= CURRENT_DATE)
     AND (rc.vigencia_fim IS NULL OR rc.vigencia_fim >= CURRENT_DATE)
   ORDER BY rc.prioridade ASC, rc.versao DESC LIMIT 1;
  IF FOUND THEN
    v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
    v_origem := 'REGRA_ITEM'; v_versao := r.versao;
  END IF;

  -- (3) regra por categoria
  IF v_pc IS NULL AND v_categoria IS NOT NULL THEN
    SELECT * INTO r FROM public.regras_classificacao_receita rc
     WHERE rc.empresa_representada_id = v_empresa AND rc.ativo = true AND rc.deleted_at IS NULL
       AND rc.alvo_tipo = 'CATEGORIA' AND rc.categoria_id = v_categoria
       AND (rc.vigencia_ini IS NULL OR rc.vigencia_ini <= CURRENT_DATE)
       AND (rc.vigencia_fim IS NULL OR rc.vigencia_fim >= CURRENT_DATE)
     ORDER BY rc.prioridade ASC, rc.versao DESC LIMIT 1;
    IF FOUND THEN
      v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
      v_origem := 'REGRA_CATEGORIA'; v_versao := r.versao;
    END IF;
  END IF;

  -- (4) default do cadastro
  IF v_pc IS NULL THEN
    IF v_item.produto_id IS NOT NULL THEN
      SELECT pr.plano_conta_receita_id, pr.centro_custo_id, pr.natureza_receita_id
        INTO v_pc, v_cc, v_nr FROM public.produtos pr WHERE pr.id = v_item.produto_id;
    ELSIF v_item.servico_id IS NOT NULL THEN
      SELECT sv.plano_conta_receita_id, sv.centro_custo_id, sv.natureza_receita_id
        INTO v_pc, v_cc, v_nr FROM public.servicos sv WHERE sv.id = v_item.servico_id;
    END IF;
    IF v_pc IS NOT NULL THEN v_origem := 'CADASTRO_DEFAULT'; v_versao := 1; END IF;
  END IF;

  -- (4b) default da categoria (cadastro)
  IF v_pc IS NULL AND v_categoria IS NOT NULL THEN
    SELECT cp.plano_conta_receita_id, cp.centro_custo_id, cp.natureza_receita_id
      INTO v_pc, v_cc, v_nr FROM public.categorias_produtos cp WHERE cp.id = v_categoria;
    IF v_pc IS NOT NULL THEN v_origem := 'CATEGORIA_DEFAULT'; v_versao := 1; END IF;
  END IF;

  -- (5) regra por tipo
  IF v_pc IS NULL THEN
    SELECT * INTO r FROM public.regras_classificacao_receita rc
     WHERE rc.empresa_representada_id = v_empresa AND rc.ativo = true AND rc.deleted_at IS NULL
       AND rc.alvo_tipo = 'TIPO' AND rc.tipo_item = v_tipo
       AND (rc.vigencia_ini IS NULL OR rc.vigencia_ini <= CURRENT_DATE)
       AND (rc.vigencia_fim IS NULL OR rc.vigencia_fim >= CURRENT_DATE)
     ORDER BY rc.prioridade ASC, rc.versao DESC LIMIT 1;
    IF FOUND THEN
      v_pc := r.plano_conta_id; v_cc := r.centro_custo_id; v_nr := r.natureza_receita_id;
      v_origem := 'REGRA_TIPO'; v_versao := r.versao;
    END IF;
  END IF;

  -- (6) default da empresa
  IF v_pc IS NULL THEN
    SELECT er.plano_conta_receita_default_id, er.centro_custo_default_id, er.natureza_receita_default_id
      INTO v_pc, v_cc, v_nr FROM public.empresas_representadas er WHERE er.id = v_empresa;
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
