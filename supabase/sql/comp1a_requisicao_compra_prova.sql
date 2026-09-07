-- Prova da Requisição de Compra (COMP-1a) — dado sintético, BEGIN...ROLLBACK.
--
-- IMPORTANTE: esta fatia não usa RPC — a autorização é 100% via RLS nas
-- tabelas. A conexão de `supabase db query` roda como `postgres`
-- (rolbypassrls=true), que ignora RLS por completo — testar direto por ela
-- daria falso positivo (ou, na pior hipótese, falharia alto e escondendo a
-- causa real). Por isso o corpo roda sob `SET LOCAL ROLE authenticated`
-- (confirmado por sondagem antes desta prova: sem JWT = 0 linhas visíveis,
-- com JWT do dono = 1 linha visível), o mesmo papel usado de verdade pelo
-- PostgREST/cliente Supabase-JS. Os lookups iniciais (empresa/produto de
-- teste) rodam antes da troca de role, como postgres, só pra não precisar de
-- policy de leitura ampla adicional pra isso.
--
-- Cobre: criação com item; segregação de cancelamento (terceiro sem
-- admin/solicitante é bloqueado pela RLS); solicitante cancela a própria;
-- requisição cancelada não pode mais ser editada (USING trava em
-- status='ABERTA').

CREATE FUNCTION pg_temp.prova_comp1a() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_produto_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL
  v_user_b uuid := '7592b882-d97a-4283-a49c-a41c46de05dd'; -- MANOEL
  v_req_id uuid;
  v_status text;
  v_afetadas int;
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_a;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa de teste não encontrada';
  END IF;

  -- Banco de produção não tem nenhum produto cadastrado ainda (achado da
  -- prova, não bug desta fatia) — cria um sintético só pra este teste.
  INSERT INTO public.produtos (empresa_representada_id, nome)
  VALUES (v_empresa_id, 'PROVA COMP-1a — produto sintético')
  RETURNING id INTO v_produto_id;
  RETURN NEXT format('OK: empresa=%s produto=%s (sintético — banco não tinha nenhum produto real)', v_empresa_id, v_produto_id);

  -- Demove userB de admin ANTES de trocar de role (como postgres, sem RLS no
  -- caminho) — mantém acesso à empresa via role 'operador'.
  UPDATE public.user_roles SET role = 'operador'
  WHERE user_id = v_user_b AND role = 'admin' AND empresa_representada_id = v_empresa_id;

  EXECUTE 'SET LOCAL ROLE authenticated';

  -- userA cria a requisição com 1 item.
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);

  INSERT INTO public.requisicoes_compra (empresa_representada_id, solicitante_id, justificativa, data_necessidade)
  VALUES (v_empresa_id, v_user_a, 'Prova COMP-1a — material de teste', CURRENT_DATE + 7)
  RETURNING id INTO v_req_id;

  INSERT INTO public.requisicoes_compra_itens (requisicao_id, empresa_representada_id, produto_id, quantidade, observacao)
  VALUES (v_req_id, v_empresa_id, v_produto_id, 10, 'Prova de item');

  SELECT status INTO v_status FROM public.requisicoes_compra WHERE id = v_req_id;
  IF v_status IS DISTINCT FROM 'ABERTA' THEN
    RAISE EXCEPTION 'RLS bloqueou a própria leitura do solicitante logo após criar (status=%)', v_status;
  END IF;
  RETURN NEXT 'OK: requisição criada com item (sob RLS, role authenticated), status ABERTA';

  -- Terceiro (userB, agora sem admin) tenta cancelar — RLS deve bloquear
  -- (0 linhas afetadas, sem erro — é assim que UPDATE sob RLS se comporta).
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  UPDATE public.requisicoes_compra SET status = 'CANCELADA' WHERE id = v_req_id;
  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  IF v_afetadas <> 0 THEN
    RAISE EXCEPTION 'FALHA_DA_PROVA: terceiro sem autoridade conseguiu cancelar (% linha(s))', v_afetadas;
  END IF;
  RETURN NEXT 'OK: terceiro sem admin/solicitante foi bloqueado pela RLS ao tentar cancelar (0 linhas afetadas)';

  -- Confirma que o status realmente não mudou (não só que o UPDATE não achou nada).
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  SELECT status INTO v_status FROM public.requisicoes_compra WHERE id = v_req_id;
  IF v_status <> 'ABERTA' THEN
    RAISE EXCEPTION 'Status mudou apesar do bloqueio esperado: %', v_status;
  END IF;

  -- O próprio solicitante cancela.
  UPDATE public.requisicoes_compra SET status = 'CANCELADA' WHERE id = v_req_id;
  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  IF v_afetadas <> 1 THEN
    RAISE EXCEPTION 'Cancelamento pelo solicitante não afetou 1 linha (afetou %)', v_afetadas;
  END IF;
  SELECT status INTO v_status FROM public.requisicoes_compra WHERE id = v_req_id;
  IF v_status <> 'CANCELADA' THEN
    RAISE EXCEPTION 'Status não virou CANCELADA: %', v_status;
  END IF;
  RETURN NEXT 'OK: solicitante cancelou a própria requisição';

  -- Requisição cancelada não pode mais ser editada, nem pelo próprio solicitante
  -- (USING trava em status='ABERTA' pra qualquer UPDATE, cancelamento incluso).
  UPDATE public.requisicoes_compra SET justificativa = 'tentando editar depois de cancelada' WHERE id = v_req_id;
  GET DIAGNOSTICS v_afetadas = ROW_COUNT;
  IF v_afetadas <> 0 THEN
    RAISE EXCEPTION 'FALHA_DA_PROVA: requisição cancelada foi editada (% linha(s))', v_afetadas;
  END IF;
  RETURN NEXT 'OK: requisição cancelada não pode mais ser editada';

  RETURN NEXT 'PROVA COMP-1a COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_comp1a();
