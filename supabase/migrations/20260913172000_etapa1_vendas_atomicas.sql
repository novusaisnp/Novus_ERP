-- Serializa operações sobre o mesmo produto, inclusive saídas de vendas diferentes.
CREATE OR REPLACE FUNCTION public.etapa1_lock_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mov public.estoque_movimentacoes; v_id uuid;
BEGIN
  v_mov := CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  IF TG_OP='UPDATE' AND (NEW.produto_id IS DISTINCT FROM OLD.produto_id OR NEW.empresa_representada_id IS DISTINCT FROM OLD.empresa_representada_id) THEN
    RAISE EXCEPTION 'Produto e empresa da movimentação são imutáveis';
  END IF;
  PERFORM 1 FROM public.produtos WHERE id=v_mov.produto_id AND empresa_representada_id=v_mov.empresa_representada_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto inválido nesta empresa' USING ERRCODE='42501'; END IF;
  FOREACH v_id IN ARRAY ARRAY[v_mov.localizacao_origem_id,v_mov.localizacao_destino_id] LOOP
    IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.localizacoes_estoque WHERE id=v_id AND empresa_representada_id=v_mov.empresa_representada_id) THEN
      RAISE EXCEPTION 'Localização inválida nesta empresa' USING ERRCODE='42501';
    END IF;
  END LOOP;
  IF v_mov.quantidade <= 0 OR v_mov.quantidade::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER aaa_etapa1_lock_estoque BEFORE INSERT OR UPDATE OR DELETE ON public.estoque_movimentacoes
FOR EACH ROW EXECUTE FUNCTION public.etapa1_lock_estoque();

CREATE OR REPLACE FUNCTION public.baixar_estoque_venda(p_venda_id uuid,p_localizacao_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.vendas; i record; n integer:=0;
BEGIN
  SELECT * INTO v FROM public.vendas WHERE id=p_venda_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF v.status NOT IN ('CONFIRMADO','EM_PRODUCAO','FATURADO','ENTREGUE') THEN RAISE EXCEPTION 'Venda não efetivada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.localizacoes_estoque WHERE id=p_localizacao_id AND empresa_representada_id=v.empresa_representada_id) THEN
    RAISE EXCEPTION 'Selecione uma localização da empresa para baixar o estoque';
  END IF;
  FOR i IN SELECT iv.produto_id,sum(iv.quantidade) quantidade FROM public.itens_venda iv
    JOIN public.produtos p ON p.id=iv.produto_id AND p.empresa_representada_id=iv.empresa_representada_id
    WHERE iv.venda_id=v.id AND iv.empresa_representada_id=v.empresa_representada_id AND p.controla_estoque
    GROUP BY iv.produto_id ORDER BY iv.produto_id LOOP
    IF NOT EXISTS (SELECT 1 FROM public.estoque_movimentacoes WHERE venda_id=v.id AND produto_id=i.produto_id AND tipo='SAIDA' AND deleted_at IS NULL) THEN
      INSERT INTO public.estoque_movimentacoes(empresa_representada_id,produto_id,tipo,quantidade,localizacao_origem_id,venda_id,documento_ref,created_by)
        VALUES(v.empresa_representada_id,i.produto_id,'SAIDA',i.quantidade,p_localizacao_id,v.id,v.numero_venda,auth.uid());
      n:=n+1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'baixados',n);
END;
$$;

CREATE OR REPLACE FUNCTION public.estornar_estoque_venda(p_venda_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.vendas; i record; n integer:=0;
BEGIN
  SELECT * INTO v FROM public.vendas WHERE id=p_venda_id FOR UPDATE;
  IF NOT FOUND OR v.status IS DISTINCT FROM 'CANCELADO' THEN RAISE EXCEPTION 'Cancele a venda pela operação transacional'; END IF;
  FOR i IN SELECT id FROM public.estoque_movimentacoes WHERE venda_id=v.id AND empresa_representada_id=v.empresa_representada_id
    AND tipo='SAIDA' AND deleted_at IS NULL ORDER BY produto_id,id LOOP
    -- O recálculo exclui deleted_at: inserir ENTRADA também devolveria o dobro.
    -- O trigger de histórico guarda OLD/NEW; nenhuma movimentação é apagada fisicamente.
    UPDATE public.estoque_movimentacoes SET deleted_at=now(),observacoes=concat_ws(E'\n',observacoes,'Estorno por cancelamento da venda') WHERE id=i.id;
    n:=n+1;
  END LOOP;
  RETURN jsonb_build_object('ok',true,'estornados',n);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.baixar_estoque_venda(uuid,uuid),public.estornar_estoque_venda(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.etapa1_venda_integridade()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.empresa_representada_id IS DISTINCT FROM OLD.empresa_representada_id THEN RAISE EXCEPTION 'Empresa da venda é imutável'; END IF;
  IF OLD.status='RASCUNHO' AND NEW.status IN ('CONFIRMADO','EM_PRODUCAO','FATURADO','ENTREGUE') AND NEW.localizacao_estoque_id IS NULL THEN
    SELECT id INTO NEW.localizacao_estoque_id FROM public.localizacoes_estoque
      WHERE empresa_representada_id=NEW.empresa_representada_id AND ativo ORDER BY id LIMIT 1;
  END IF;
  IF OLD.status='CANCELADO' AND NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'Venda cancelada não pode ser reaberta'; END IF;
  IF OLD.status <> 'RASCUNHO' AND NEW.status='RASCUNHO' THEN RAISE EXCEPTION 'Venda efetivada não pode voltar a rascunho'; END IF;
  IF OLD.status <> 'RASCUNHO' AND
    (to_jsonb(NEW)-ARRAY['status','observacoes','observacoes_internas','data_entrega_prevista','updated_at','deleted_at','status_fiscal']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['status','observacoes','observacoes_internas','data_entrega_prevista','updated_at','deleted_at','status_fiscal']) THEN
    RAISE EXCEPTION 'Venda efetivada: cancele a operação antes de alterar cliente, itens ou valores';
  END IF;
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND OLD.status NOT IN ('RASCUNHO','CANCELADO') THEN
    RAISE EXCEPTION 'Cancele a venda antes de excluir';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER etapa1_venda_integridade BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.etapa1_venda_integridade();

-- Também alcança conversão de orçamento: qualquer transição efetiva baixa/reverte na mesma transação.
CREATE OR REPLACE FUNCTION public.etapa1_venda_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_local uuid;
BEGIN
  IF NEW.status='CANCELADO' AND OLD.status IS DISTINCT FROM 'CANCELADO' THEN
    IF EXISTS (SELECT 1 FROM public.contas_receber WHERE venda_id=NEW.id AND deleted_at IS NULL AND status <> 'CANCELADO')
      OR EXISTS (SELECT 1 FROM public.fiscal_documentos_eletronicos WHERE venda_id=NEW.id AND status IN ('AUTORIZADA','EM_PROCESSAMENTO')) THEN
      RAISE EXCEPTION 'Cancele os títulos e documentos fiscais vinculados antes de cancelar a venda';
    END IF;
    PERFORM public.estornar_estoque_venda(NEW.id);
  ELSIF OLD.status='RASCUNHO' AND NEW.status IN ('CONFIRMADO','EM_PRODUCAO','FATURADO','ENTREGUE') THEN
    IF EXISTS (SELECT 1 FROM public.itens_venda iv JOIN public.produtos p ON p.id=iv.produto_id
      WHERE iv.venda_id=NEW.id AND p.controla_estoque) THEN
      v_local:=NEW.localizacao_estoque_id;
      IF v_local IS NULL THEN
        SELECT id INTO v_local FROM public.localizacoes_estoque WHERE empresa_representada_id=NEW.empresa_representada_id AND ativo ORDER BY id LIMIT 1;
      END IF;
      PERFORM public.baixar_estoque_venda(NEW.id,v_local);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER etapa1_venda_estoque AFTER UPDATE OF status ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.etapa1_venda_estoque();

CREATE OR REPLACE FUNCTION public.venda_salvar_atomica(p_empresa_id uuid,p_dados jsonb,p_itens jsonb,p_venda_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.vendas; anterior public.vendas; i public.itens_venda; j jsonb; dados jsonb; itens jsonb:='[]'; atuais jsonb;
  subtotal numeric:=0; total_item numeric; estado text;
BEGIN
  PERFORM public.exigir_permissao_empresa(p_empresa_id,CASE WHEN p_venda_id IS NULL THEN 'vendas.create' ELSE 'vendas.update' END);
  IF jsonb_typeof(p_dados) IS DISTINCT FROM 'object' OR jsonb_typeof(p_itens) IS DISTINCT FROM 'array' OR jsonb_array_length(p_itens)=0 THEN
    RAISE EXCEPTION 'Informe a venda e ao menos um item';
  END IF;
  SELECT COALESCE(jsonb_object_agg(key,value),'{}') INTO dados FROM jsonb_each(p_dados)
    WHERE key=ANY(ARRAY['cliente_id','numero_venda','data_venda','data_entrega_prevista','status','origem','canal_venda',
      'desconto','acrescimo','valor_frete','plano_pagamento_id','vendedor_id','localizacao_estoque_id','observacoes','observacoes_internas']);
  IF p_venda_id IS NOT NULL THEN
    SELECT * INTO anterior FROM public.vendas WHERE id=p_venda_id AND empresa_representada_id=p_empresa_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Venda indisponível nesta empresa' USING ERRCODE='42501'; END IF;
  END IF;
  v:=jsonb_populate_record(anterior,dados);
  v.id:=COALESCE(p_venda_id,gen_random_uuid()); v.empresa_representada_id:=p_empresa_id;
  v.data_venda:=COALESCE(v.data_venda,CURRENT_DATE); estado:=COALESCE(v.status,'RASCUNHO');
  IF estado NOT IN ('RASCUNHO','CONFIRMADO','EM_PRODUCAO','FATURADO','ENTREGUE') THEN RAISE EXCEPTION 'Use a ação Cancelar para cancelar a venda'; END IF;
  v.desconto:=COALESCE(v.desconto,0); v.acrescimo:=COALESCE(v.acrescimo,0); v.valor_frete:=COALESCE(v.valor_frete,0);
  IF v.cliente_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.entidades WHERE id=v.cliente_id AND empresa_representada_id=p_empresa_id) THEN RAISE EXCEPTION 'Cliente inválido nesta empresa'; END IF;
  IF v.plano_pagamento_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.planos_pagamento WHERE id=v.plano_pagamento_id AND empresa_representada_id=p_empresa_id) THEN RAISE EXCEPTION 'Plano de pagamento inválido nesta empresa'; END IF;
  IF v.vendedor_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id=v.vendedor_id AND empresa_representada_id=p_empresa_id) THEN RAISE EXCEPTION 'Vendedor inválido nesta empresa'; END IF;
  IF v.localizacao_estoque_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.localizacoes_estoque WHERE id=v.localizacao_estoque_id AND empresa_representada_id=p_empresa_id) THEN RAISE EXCEPTION 'Localização inválida nesta empresa'; END IF;
  FOR j IN SELECT value FROM jsonb_array_elements(p_itens) LOOP
    i:=jsonb_populate_record(NULL::public.itens_venda,j);
    i.quantidade:=COALESCE(i.quantidade,1); i.preco_unitario:=COALESCE(i.preco_unitario,0);
    i.desconto_item:=COALESCE(i.desconto_item,0); i.acrescimo_item:=COALESCE(i.acrescimo_item,0);
    IF i.quantidade<=0 OR i.preco_unitario<0 OR i.desconto_item<0 OR i.acrescimo_item<0
      OR i.quantidade::text IN ('NaN','Infinity','-Infinity') OR i.preco_unitario::text IN ('NaN','Infinity','-Infinity')
      OR i.desconto_item::text IN ('NaN','Infinity','-Infinity') OR i.acrescimo_item::text IN ('NaN','Infinity','-Infinity')
      OR NULLIF(trim(i.descricao),'') IS NULL THEN RAISE EXCEPTION 'Item com quantidade, preço ou descrição inválidos'; END IF;
    IF i.produto_id IS NOT NULL AND i.servico_id IS NOT NULL THEN RAISE EXCEPTION 'Item não pode ser produto e serviço simultaneamente'; END IF;
    IF i.produto_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.produtos WHERE id=i.produto_id AND empresa_representada_id=p_empresa_id AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Produto inválido nesta empresa'; END IF;
    IF i.servico_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.servicos WHERE id=i.servico_id AND empresa_representada_id=p_empresa_id) THEN RAISE EXCEPTION 'Serviço inválido nesta empresa'; END IF;
    total_item:=round(i.quantidade*i.preco_unitario-i.desconto_item+i.acrescimo_item,2);
    IF total_item<0 THEN RAISE EXCEPTION 'Desconto excede valor do item'; END IF;
    subtotal:=subtotal+total_item;
    itens:=itens||jsonb_build_object('produto_id',i.produto_id,'servico_id',i.servico_id,'tipo_item',CASE WHEN i.servico_id IS NULL THEN 'P' ELSE 'S' END,
      'descricao',i.descricao,'quantidade',i.quantidade,'unidade',i.unidade,'preco_unitario',i.preco_unitario,
      'desconto_item',i.desconto_item,'acrescimo_item',i.acrescimo_item,'valor_total_item',total_item,
      'ordem',COALESCE(i.ordem,jsonb_array_length(itens)),'observacoes',i.observacoes);
  END LOOP;
  v.subtotal:=subtotal; v.valor_total:=subtotal-v.desconto+v.acrescimo+v.valor_frete;
  IF v.desconto<0 OR v.acrescimo<0 OR v.valor_frete<0 OR v.valor_total<0 OR v.valor_total::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Totais inválidos'; END IF;
  IF anterior.id IS NOT NULL AND anterior.status <> 'RASCUNHO' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('produto_id',produto_id,'servico_id',servico_id,'tipo_item',tipo_item,
      'descricao',descricao,'quantidade',quantidade,'unidade',unidade,'preco_unitario',preco_unitario,'desconto_item',COALESCE(desconto_item,0),
      'acrescimo_item',COALESCE(acrescimo_item,0),'valor_total_item',valor_total_item,'ordem',ordem,'observacoes',observacoes) ORDER BY ordem),'[]')
      INTO atuais FROM public.itens_venda WHERE venda_id=v.id;
    IF atuais IS DISTINCT FROM itens THEN RAISE EXCEPTION 'Itens de venda efetivada não podem ser alterados; cancele a venda'; END IF;
  END IF;
  IF anterior.id IS NULL THEN
    INSERT INTO public.vendas(id,empresa_representada_id,cliente_id,data_venda,tipo,status) VALUES(v.id,p_empresa_id,v.cliente_id,v.data_venda,
      CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(itens) x WHERE x->>'tipo_item'='S') THEN
        CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(itens) x WHERE x->>'tipo_item'='P') THEN 'H' ELSE 'S' END ELSE 'P' END,'RASCUNHO');
  END IF;
  IF anterior.id IS NULL OR anterior.status='RASCUNHO' THEN
    DELETE FROM public.itens_venda WHERE venda_id=v.id AND empresa_representada_id=p_empresa_id;
    INSERT INTO public.itens_venda(empresa_representada_id,venda_id,produto_id,servico_id,tipo_item,descricao,quantidade,unidade,preco_unitario,desconto_item,acrescimo_item,valor_total_item,ordem,observacoes)
      SELECT p_empresa_id,v.id,x.produto_id,x.servico_id,x.tipo_item,x.descricao,x.quantidade,x.unidade,x.preco_unitario,x.desconto_item,x.acrescimo_item,x.valor_total_item,x.ordem,x.observacoes
      FROM jsonb_populate_recordset(NULL::public.itens_venda,itens) x;
  END IF;
  UPDATE public.vendas SET cliente_id=v.cliente_id,numero_venda=v.numero_venda,data_venda=v.data_venda,data_entrega_prevista=v.data_entrega_prevista,
    status=estado,origem=v.origem,canal_venda=v.canal_venda,subtotal=v.subtotal,desconto=v.desconto,acrescimo=v.acrescimo,valor_frete=v.valor_frete,
    valor_total=v.valor_total,plano_pagamento_id=v.plano_pagamento_id,vendedor_id=v.vendedor_id,localizacao_estoque_id=v.localizacao_estoque_id,
    observacoes=v.observacoes,observacoes_internas=v.observacoes_internas WHERE id=v.id AND empresa_representada_id=p_empresa_id;
  RETURN (SELECT to_jsonb(s)||jsonb_build_object('itens',(SELECT jsonb_agg(to_jsonb(x) ORDER BY ordem) FROM public.itens_venda x WHERE venda_id=s.id)) FROM public.vendas s WHERE id=v.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.venda_cancelar_atomica(p_empresa_id uuid,p_venda_id uuid,p_excluir boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v public.vendas;
BEGIN
  PERFORM public.exigir_permissao_empresa(p_empresa_id,CASE WHEN p_excluir THEN 'vendas.delete' ELSE 'vendas.cancelamento' END);
  SELECT * INTO v FROM public.vendas WHERE id=p_venda_id AND empresa_representada_id=p_empresa_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda indisponível nesta empresa' USING ERRCODE='42501'; END IF;
  IF p_excluir THEN
    IF v.status NOT IN ('RASCUNHO','CANCELADO') THEN RAISE EXCEPTION 'Cancele a venda antes de excluir'; END IF;
    UPDATE public.vendas SET deleted_at=COALESCE(deleted_at,now()) WHERE id=v.id AND empresa_representada_id=p_empresa_id;
  ELSE
    UPDATE public.vendas SET status='CANCELADO' WHERE id=v.id AND empresa_representada_id=p_empresa_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.venda_salvar_atomica(uuid,jsonb,jsonb,uuid),public.venda_cancelar_atomica(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.venda_salvar_atomica(uuid,jsonb,jsonb,uuid),public.venda_cancelar_atomica(uuid,uuid,boolean) TO authenticated;
