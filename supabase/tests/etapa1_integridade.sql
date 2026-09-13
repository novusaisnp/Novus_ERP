-- Executado por scripts/check-etapa1.mjs dentro de BEGIN/ROLLBACK.
CREATE TEMP TABLE etapa1_fixture(empresa uuid,outra uuid,usuario uuid,cliente uuid,produto uuid,localizacao uuid,conta uuid,venda uuid);
GRANT SELECT,UPDATE ON etapa1_fixture TO authenticated;
CREATE FUNCTION pg_temp.check_ok(ok boolean,msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %',msg; END IF; END; $$;
DO $$
DECLARE e uuid:=gen_random_uuid(); o uuid:=gen_random_uuid(); u uuid; c uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); l uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); pc uuid:=gen_random_uuid();
BEGIN
  SELECT user_id INTO u FROM public.user_roles WHERE role='admin' LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'É necessário usuário administrativo para a fixture revertida'; END IF;
  INSERT INTO public.empresas_representadas(id,nome) VALUES(e,'TESTE ETAPA1 ROLLBACK'),(o,'TESTE ETAPA1 OUTRA');
  INSERT INTO public.plano_contas(id,empresa_representada_id,codigo,nome,tipo) VALUES(pc,e,'ETAPA1','Receita teste','RECEITA');
  UPDATE public.empresas_representadas SET plano_conta_receita_default_id=pc WHERE id=e;
  INSERT INTO public.user_roles(user_id,role,empresa_representada_id) VALUES(u,'admin',e),(u,'visualizador',o);
  INSERT INTO public.entidades(id,empresa_representada_id,tipo_pessoa,nome) VALUES(c,e,'PJ','Cliente teste');
  INSERT INTO public.produtos(id,empresa_representada_id,nome,controla_estoque) VALUES(p,e,'Produto teste',true);
  INSERT INTO public.localizacoes_estoque(id,empresa_representada_id,nome) VALUES(l,e,'Local teste');
  INSERT INTO public.estoque_movimentacoes(empresa_representada_id,produto_id,tipo,quantidade,localizacao_destino_id) VALUES(e,p,'ENTRADA',10,l);
  INSERT INTO public.contas_bancarias(id,empresa_representada_id,numero_conta,conta_cofre,saldo_inicial) VALUES(b,e,'TESTE',true,100);
  INSERT INTO etapa1_fixture VALUES(e,o,u,c,p,l,b,NULL);
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
END;
$$;

-- Falhas deliberadas somente em registros novos deste teste.
CREATE FUNCTION pg_temp.falha_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF NEW.descricao='FALHA_ETAPA1' THEN RAISE EXCEPTION 'FALHA_INJETADA_ITEM'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER etapa1_test_falha_item BEFORE INSERT ON public.itens_venda FOR EACH ROW EXECUTE FUNCTION pg_temp.falha_item();
CREATE FUNCTION pg_temp.falha_estorno() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN IF current_setting('etapa1.falhar_estorno',true)='sim' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'FALHA_INJETADA_ESTORNO'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER etapa1_test_falha_estorno BEFORE UPDATE ON public.estoque_movimentacoes FOR EACH ROW EXECUTE FUNCTION pg_temp.falha_estorno();

SET LOCAL ROLE authenticated;
DO $$
DECLARE f record; v jsonb; itens jsonb; payload jsonb; antes jsonb; negado boolean;
BEGIN
  SELECT * INTO f FROM etapa1_fixture;
  PERFORM pg_temp.check_ok(public.pode_na_empresa(f.empresa,'vendas.create'),'admin da empresa autorizado');
  PERFORM pg_temp.check_ok(NOT public.pode_na_empresa(f.outra,'financeiro.update'),'admin de uma empresa não promove visualizador de outra');
  negado:=false;
  BEGIN INSERT INTO public.contas_bancarias(empresa_representada_id,numero_conta) VALUES(f.outra,'INDEVIDO');
  EXCEPTION WHEN insufficient_privilege THEN negado:=true; END;
  PERFORM pg_temp.check_ok(negado,'RLS rejeita escrita de visualizador');
  negado:=false;
  BEGIN INSERT INTO public.contas_receber(empresa_representada_id,descricao,valor_original,data_vencimento) VALUES(f.empresa,'INDEVIDO',1,CURRENT_DATE);
  EXCEPTION WHEN insufficient_privilege THEN negado:=true; END;
  PERFORM pg_temp.check_ok(negado,'título não pode ser inserido diretamente');
  negado:=false;
  BEGIN PERFORM public.transferencia_bancaria_atomica(f.outra,f.conta,f.conta,1,CURRENT_DATE,'teste','teste',NULL,NULL,NULL);
  EXCEPTION WHEN insufficient_privilege THEN negado:=true; END;
  PERFORM pg_temp.check_ok(negado,'RPC não permite bypass de permissão por role em outra empresa');
  itens:=jsonb_build_array(jsonb_build_object('produto_id',f.produto,'descricao','Produto teste','quantidade',2,'preco_unitario',10));
  payload:=jsonb_build_object('cliente_id',f.cliente,'status','RASCUNHO','localizacao_estoque_id',f.localizacao,'valor_total',999999);
  v:=public.venda_salvar_atomica(f.empresa,payload,itens);
  UPDATE etapa1_fixture SET venda=(v->>'id')::uuid;
  PERFORM pg_temp.check_ok((v->>'valor_total')::numeric=20,'servidor calcula o total');
  antes:=v;
  BEGIN
    PERFORM public.venda_salvar_atomica(f.empresa,payload||'{"numero_venda":"ALTERADA"}',jsonb_set(itens,'{0,descricao}','"FALHA_ETAPA1"'),(v->>'id')::uuid);
    RAISE EXCEPTION 'FALHA_NAO_DISPAROU';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'FALHA_INJETADA_ITEM' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.check_ok((SELECT count(*)=1 FROM public.itens_venda WHERE venda_id=(v->>'id')::uuid),'itens preservados após falha');
  PERFORM pg_temp.check_ok((SELECT numero_venda IS NULL FROM public.vendas WHERE id=(v->>'id')::uuid),'cabeçalho preservado após falha');
  BEGIN
    PERFORM public.venda_salvar_atomica(f.empresa,payload||'{"status":"CONFIRMADO"}',jsonb_set(itens,'{0,quantidade}','99'),(v->>'id')::uuid);
    RAISE EXCEPTION 'FALHA_NAO_DISPAROU';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'SALDO_INSUFICIENTE%' THEN RAISE; END IF;
  END;
  PERFORM pg_temp.check_ok((SELECT status='RASCUNHO' FROM public.vendas WHERE id=(v->>'id')::uuid),'status revertido após falta de estoque');
  v:=public.venda_salvar_atomica(f.empresa,payload||'{"status":"CONFIRMADO"}',itens,(v->>'id')::uuid);
  PERFORM pg_temp.check_ok((SELECT estoque_atual=8 FROM public.produtos WHERE id=f.produto),'baixa única');
  negado:=false;
  BEGIN PERFORM public.venda_salvar_atomica(f.empresa,payload||'{"status":"CONFIRMADO"}',jsonb_set(itens,'{0,quantidade}','3'),(v->>'id')::uuid);
  EXCEPTION WHEN raise_exception THEN negado:=SQLERRM LIKE 'Itens de venda efetivada%'; END;
  PERFORM pg_temp.check_ok(negado,'não edita itens efetivados');
  v:=public.venda_salvar_atomica(f.empresa,payload||'{"status":"ENTREGUE"}',itens,(v->>'id')::uuid);
  PERFORM pg_temp.check_ok((SELECT estoque_atual=8 FROM public.produtos WHERE id=f.produto),'mudança de etapa não repete baixa');
  PERFORM set_config('etapa1.falhar_estorno','sim',true);
  BEGIN PERFORM public.venda_cancelar_atomica(f.empresa,(v->>'id')::uuid); RAISE EXCEPTION 'FALHA_NAO_DISPAROU';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'FALHA_INJETADA_ESTORNO' THEN RAISE; END IF; END;
  PERFORM pg_temp.check_ok((SELECT status='ENTREGUE' FROM public.vendas WHERE id=(v->>'id')::uuid),'cancelamento revertido após falha de estorno');
  PERFORM set_config('etapa1.falhar_estorno','nao',true);
  PERFORM public.venda_cancelar_atomica(f.empresa,(v->>'id')::uuid);
  PERFORM public.venda_cancelar_atomica(f.empresa,(v->>'id')::uuid);
  PERFORM pg_temp.check_ok((SELECT estoque_atual=10 FROM public.produtos WHERE id=f.produto),'estorno devolve exatamente uma vez, não dobra');
  negado:=false;
  BEGIN UPDATE public.contas_bancarias SET saldo_atual=999 WHERE id=f.conta;
  EXCEPTION WHEN insufficient_privilege THEN negado:=true; END;
  PERFORM pg_temp.check_ok(negado,'saldo atual não pode ser forjado pelo cliente');
  INSERT INTO public.movimentacoes_bancarias(empresa_representada_id,conta_bancaria_id,tipo,valor,data_lancamento,status,descricao)
    VALUES(f.empresa,f.conta,'DEPOSITO',30,CURRENT_DATE,'EFETIVADO','Teste etapa1');
  UPDATE public.contas_bancarias SET saldo_inicial=200 WHERE id=f.conta;
  PERFORM pg_temp.check_ok((SELECT saldo_atual=230 FROM public.contas_bancarias WHERE id=f.conta),'delta preserva movimento');
  UPDATE public.movimentacoes_bancarias SET deleted_at=now() WHERE conta_bancaria_id=f.conta;
  PERFORM pg_temp.check_ok((SELECT saldo_atual=200 FROM public.contas_bancarias WHERE id=f.conta),'exclusão lógica também recalcula saldo');
END;
$$;
RESET ROLE;
