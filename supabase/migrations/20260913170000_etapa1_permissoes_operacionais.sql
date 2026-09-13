-- Etapa 1: a permissão pertence à empresa da operação, não à primeira role do usuário.
CREATE OR REPLACE FUNCTION public.pode_na_empresa(p_empresa_id uuid, p_permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND p_empresa_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'novus_owner') OR (
      public.user_has_access_to_empresa(p_empresa_id) AND (
        public.has_role_for_empresa(auth.uid(), 'admin', p_empresa_id) OR EXISTS (
          SELECT 1 FROM public.usuarios u JOIN public.perfis_acesso p ON p.id = u.perfil_id
          WHERE u.user_id = auth.uid() AND u.empresa_representada_id = p_empresa_id
            AND u.ativo AND p.ativo AND p.permissoes ? p_permissao
            AND (p.empresa_representada_id IS NULL OR p.empresa_representada_id = p_empresa_id)
        )
      )
    )
  );
$$;
CREATE OR REPLACE FUNCTION public.exigir_permissao_empresa(p_empresa_id uuid, p_permissao text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.pode_na_empresa(p_empresa_id, p_permissao) THEN
    RAISE EXCEPTION 'Permissão negada: %', p_permissao USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.pode_na_empresa(uuid,text), public.exigir_permissao_empresa(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_na_empresa(uuid,text), public.exigir_permissao_empresa(uuid,text) TO authenticated;

-- RESTRICTIVE faz AND com as policies existentes: preserva restrições de estado/tenant.
DO $$
DECLARE r record; op text; capacidade text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('contas_bancarias','financeiro'), ('movimentacoes_bancarias','financeiro'),
    ('lotes_movimentacoes','financeiro'), ('contas_pagar','financeiro'), ('contas_receber','financeiro'),
    ('rateios_contas_pagar','financeiro'), ('rateios_contas_receber','financeiro'),
    ('produtos','produtos'), ('vendas','vendas'), ('itens_venda','vendas'),
    ('orcamentos_venda','vendas'), ('orcamentos_venda_itens','vendas'),
    ('venda_pagamento','vendas'), ('venda_pagamento_parcelas','vendas'),
    ('estoque_movimentacoes','estoque'), ('estoque_inventarios','estoque'), ('estoque_inventario_itens','estoque'),
    ('requisicoes_compra','compras'), ('requisicoes_compra_itens','compras'),
    ('cotacoes_compra','compras'), ('cotacoes_compra_fornecedores','compras'), ('cotacoes_compra_precos','compras'),
    ('pedidos_compra','compras'), ('pedidos_compra_itens','compras'),
    ('recebimentos_compra','compras'), ('recebimentos_compra_itens','compras')
  ) AS x(tabela,modulo) LOOP
    FOREACH op IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      capacidade := r.modulo || '.' || CASE op WHEN 'SELECT' THEN 'read' WHEN 'INSERT' THEN 'create'
        WHEN 'UPDATE' THEN CASE WHEN r.tabela IN ('contas_receber','contas_pagar') THEN 'delete' ELSE 'update' END ELSE 'delete' END;
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'etapa1_' || lower(op), r.tabela);
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR %s TO authenticated %s',
        'etapa1_' || lower(op), r.tabela, op,
        CASE WHEN op = 'INSERT' THEN format('WITH CHECK (public.pode_na_empresa(empresa_representada_id,%L))',capacidade)
        WHEN op = 'UPDATE' THEN format('USING (public.pode_na_empresa(empresa_representada_id,%L)) WITH CHECK (public.pode_na_empresa(empresa_representada_id,%L))',capacidade,capacidade)
        ELSE format('USING (public.pode_na_empresa(empresa_representada_id,%L))',capacidade) END);
    END LOOP;
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM PUBLIC, anon, authenticated', r.tabela);
  END LOOP;
END;
$$;

-- Títulos/rateios só são gravados por RPC; exclusão lógica continua compatível com a UI.
REVOKE INSERT, UPDATE, DELETE ON public.contas_receber, public.contas_pagar,
  public.rateios_contas_receber, public.rateios_contas_pagar FROM PUBLIC, anon, authenticated;
GRANT UPDATE (deleted_at) ON public.contas_receber, public.contas_pagar TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vendas, public.itens_venda, public.estoque_saldos FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_saldo_estoque(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;

-- Adiciona checagem às RPCs existentes sem duplicar seus motores de compra/pagamento.
-- Interrompe a migration se a assinatura/corpo esperado não existir.
DO $$
DECLARE r record; definicao text; corpo text; novo text; oid_func oid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('cancelar_pedido_compra(uuid)', '(SELECT empresa_representada_id FROM public.pedidos_compra WHERE id=p_pedido_id)', 'compras.delete'),
    ('confirmar_recebimento_compra(uuid,jsonb,text)', '(SELECT empresa_representada_id FROM public.pedidos_compra WHERE id=p_pedido_id)', 'compras.update'),
    ('enviar_pedido_compra_para_aprovacao(uuid)', '(SELECT empresa_representada_id FROM public.pedidos_compra WHERE id=p_pedido_id)', 'compras.update'),
    ('marcar_pedido_compra_emitido(uuid)', '(SELECT empresa_representada_id FROM public.pedidos_compra WHERE id=p_pedido_id)', 'compras.update'),
    ('gerar_pedidos_compra_da_cotacao(uuid)', '(SELECT empresa_representada_id FROM public.cotacoes_compra WHERE id=p_cotacao_id)', 'compras.create'),
    ('converter_orcamento_em_venda(jsonb)', '(SELECT empresa_representada_id FROM public.orcamentos_venda WHERE id=(p_payload->>''orcamento_id'')::uuid)', 'vendas.create'),
    ('gerar_contas_receber_da_venda(uuid,text)', '(SELECT empresa_representada_id FROM public.vendas WHERE id=p_venda_id)', 'financeiro.create'),
    ('transferencia_bancaria_atomica(uuid,uuid,uuid,numeric,date,text,text,uuid,uuid,uuid)', 'p_empresa_id', 'financeiro.create'),
    ('financeiro_liquidar_titulo(uuid,text,numeric,date,text,uuid,uuid,text,jsonb,uuid,numeric,numeric,numeric,uuid)', '(SELECT empresa_representada_id FROM public.contas_receber WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_RECEBER'' UNION ALL SELECT empresa_representada_id FROM public.contas_pagar WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_PAGAR'')', 'financeiro.liquidar'),
    ('financeiro_estornar_liquidacao(uuid,text,uuid,uuid,date)', '(SELECT empresa_representada_id FROM public.liquidacoes_titulos WHERE id=p_liquidacao_id)', 'financeiro.estorno'),
    ('financeiro_cancelar_titulo(uuid,text,text,uuid,uuid)', '(SELECT empresa_representada_id FROM public.contas_receber WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_RECEBER'' UNION ALL SELECT empresa_representada_id FROM public.contas_pagar WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_PAGAR'')', 'financeiro.cancelamento'),
    ('financeiro_renegociar_titulo(uuid,text,text,uuid,jsonb,uuid)', '(SELECT empresa_representada_id FROM public.contas_receber WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_RECEBER'' UNION ALL SELECT empresa_representada_id FROM public.contas_pagar WHERE id=p_titulo_id AND p_tipo_titulo=''CONTAS_PAGAR'')', 'financeiro.renegociacao')
  ) AS x(assinatura,empresa,permissao) LOOP
    oid_func := ('public.' || r.assinatura)::regprocedure;
    SELECT pg_get_functiondef(oid_func), prosrc INTO definicao,corpo FROM pg_proc WHERE oid=oid_func;
    IF position('-- etapa1: autorização' IN corpo) = 0 THEN
      novo := regexp_replace(corpo, '\mBEGIN\M', format(E'BEGIN\n  -- etapa1: autorização\n  PERFORM public.exigir_permissao_empresa(%s,%L);',r.empresa,r.permissao));
      IF novo = corpo THEN RAISE EXCEPTION 'Corpo inesperado: %', r.assinatura; END IF;
      EXECUTE replace(definicao,corpo,novo);
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon',r.assinatura);
  END LOOP;
END;
$$;

-- Defesa também das RPCs SECURITY DEFINER financeiras: checa tenant em cada escrita,
-- inclusive payload arbitrário enviado ao salvar título, sem exigir permissão extra
-- dos motores internos de liquidação/recebimento de compra.
CREATE OR REPLACE FUNCTION public.etapa1_validar_tenant_titulo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'novus_owner')
     AND NOT public.user_has_access_to_empresa(NEW.empresa_representada_id) THEN
    RAISE EXCEPTION 'Título pertence a outra empresa' USING ERRCODE='42501';
  END IF;
  IF TG_OP='UPDATE' AND NEW.empresa_representada_id IS DISTINCT FROM OLD.empresa_representada_id THEN
    RAISE EXCEPTION 'Empresa do título é imutável' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER etapa1_tenant BEFORE INSERT OR UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.etapa1_validar_tenant_titulo();
CREATE TRIGGER etapa1_tenant BEFORE INSERT OR UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.etapa1_validar_tenant_titulo();

-- Salvar título aceita apenas campos cadastrais. Status/baixas exigem a RPC específica.
DO $$
DECLARE d text; corpo text; novo text;
BEGIN
  SELECT pg_get_functiondef(oid),prosrc INTO d,corpo FROM pg_proc WHERE oid='public.financeiro_salvar_titulo(text,jsonb,jsonb,uuid,uuid)'::regprocedure;
  novo := replace(corpo,
    'v_dados := (p_dados - ''empresa_representada_id'' - ''id'' - ''created_at'' - ''deleted_at'');',
    $patch$
  PERFORM public.exigir_permissao_empresa(v_empresa_id, CASE WHEN p_titulo_id IS NULL THEN 'financeiro.create' ELSE 'financeiro.update' END);
  SELECT COALESCE(jsonb_object_agg(key,value),'{}'::jsonb) INTO v_dados FROM jsonb_each(p_dados)
    WHERE key = ANY(ARRAY['descricao','numero_documento','cliente_id','fornecedor_id','valor_original',
      'data_emissao','data_vencimento','data_competencia','plano_conta_id','centro_custo_id','natureza_id',
      'plano_pagamento_id','numero_parcela','total_parcelas','observacoes','recorrente','periodicidade']);
  IF p_titulo_id IS NULL AND COALESCE(p_dados->>'status','PENDENTE') NOT IN ('PENDENTE','VENCIDO') THEN
    RAISE EXCEPTION 'Use a operação de liquidação ou cancelamento para alterar o estado do título';
  END IF;
  IF p_titulo_id IS NOT NULL THEN
    EXECUTE format('SELECT empresa_representada_id FROM public.%I WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',v_tabela)
      INTO v_empresa_do_titulo USING p_titulo_id;
    IF v_empresa_do_titulo IS DISTINCT FROM v_empresa_id THEN RAISE EXCEPTION 'Título indisponível nesta empresa' USING ERRCODE='42501'; END IF;
    IF EXISTS (SELECT 1 FROM public.liquidacoes_titulos WHERE titulo_id=p_titulo_id AND tipo_titulo=p_tipo_titulo
      AND NOT COALESCE(estornado,false) AND NOT COALESCE(cancelada,false)) THEN
      RAISE EXCEPTION 'Estorne as liquidações antes de editar o título';
    END IF;
  END IF;
  IF jsonb_typeof(p_rateios) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Rateios inválidos'; END IF;
  FOR v_rateio IN SELECT value FROM jsonb_array_elements(p_rateios) LOOP
    IF (v_rateio->>'plano_conta_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.plano_contas WHERE id=(v_rateio->>'plano_conta_id')::uuid AND empresa_representada_id=v_empresa_id))
      OR (v_rateio->>'centro_custo_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.centros_custo WHERE id=(v_rateio->>'centro_custo_id')::uuid AND empresa_representada_id=v_empresa_id)) THEN
      RAISE EXCEPTION 'Rateio pertence a outra empresa' USING ERRCODE='42501';
    END IF;
  END LOOP;
    $patch$);
  IF novo=corpo THEN RAISE EXCEPTION 'financeiro_salvar_titulo divergente: revisar antes de aplicar'; END IF;
  EXECUTE replace(d,corpo,novo);
END;
$$;
