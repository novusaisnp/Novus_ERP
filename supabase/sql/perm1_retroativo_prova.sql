-- Prova de PERM-1 (bloqueio de lançamento retroativo): dado sintético em
-- transação com ROLLBACK, RPCs/insert reais (não simula efeito de trigger).
-- v_user_estranho é um UUID sem vínculo em usuarios/user_roles — sem
-- has_role nem has_permissao, prova o caminho bloqueado sem precisar criar
-- perfil/usuário de teste novo (mesma técnica já usada nas provas de FIN-4).

BEGIN;

CREATE FUNCTION pg_temp.prova_retroativo() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_admin uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_estranho uuid := '00000000-0000-4000-8000-000000000099';
  v_produto_id uuid;
  v_localizacao_id uuid;
  v_data_retroativa timestamptz := now() - interval '10 days';
BEGIN
  SELECT empresa_representada_id INTO v_empresa_id FROM public.usuarios WHERE user_id = v_user_admin;
  SELECT id INTO v_produto_id FROM public.produtos WHERE empresa_representada_id = v_empresa_id LIMIT 1;
  SELECT id INTO v_localizacao_id FROM public.localizacoes_estoque WHERE empresa_representada_id = v_empresa_id LIMIT 1;

  IF v_produto_id IS NULL THEN
    INSERT INTO public.produtos (empresa_representada_id, nome)
    VALUES (v_empresa_id, 'TESTE PERM1 — produto')
    RETURNING id INTO v_produto_id;
  END IF;
  IF v_localizacao_id IS NULL THEN
    INSERT INTO public.localizacoes_estoque (empresa_representada_id, nome)
    VALUES (v_empresa_id, 'TESTE PERM1 — localizacao')
    RETURNING id INTO v_localizacao_id;
  END IF;

  -- ===== Caso 1: estoque_movimentacoes, usuario estranho (sem permissao), data retroativa =====
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_estranho)::text, true);
  BEGIN
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, localizacao_destino_id, data_movimento
    ) VALUES (
      v_empresa_id, v_produto_id, 'ENTRADA', 1, v_localizacao_id, v_data_retroativa
    );
    RETURN NEXT 'FALHA: insert retroativo em estoque_movimentacoes deveria ter sido recusado (usuario sem permissao)';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: estoque_movimentacoes recusou insert retroativo sem permissao (' || SQLERRM || ')';
  END;

  -- ===== Caso 2: mesmo insert, mas empresa com trava liberada (NULL) =====
  UPDATE public.empresas_representadas SET limite_lancamento_retroativo_horas = NULL WHERE id = v_empresa_id;
  BEGIN
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, localizacao_destino_id, data_movimento
    ) VALUES (
      v_empresa_id, v_produto_id, 'ENTRADA', 1, v_localizacao_id, v_data_retroativa
    );
    RETURN NEXT 'OK: com a empresa em "sem limite", o mesmo insert retroativo foi aceito';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'FALHA: deveria ter sido aceito com trava liberada (' || SQLERRM || ')';
  END;

  -- ===== Caso 3: volta o limite padrao, confirma que passa a bloquear de novo =====
  UPDATE public.empresas_representadas SET limite_lancamento_retroativo_horas = 48 WHERE id = v_empresa_id;
  BEGIN
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, localizacao_destino_id, data_movimento
    ) VALUES (
      v_empresa_id, v_produto_id, 'ENTRADA', 1, v_localizacao_id, v_data_retroativa
    );
    RETURN NEXT 'FALHA: com limite=48 de volta, deveria ter recusado de novo';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: com limite=48 de volta, voltou a recusar (' || SQLERRM || ')';
  END;

  -- ===== Caso 4: admin sempre passa, mesmo com limite ativo =====
  PERFORM set_config('request.jwt.claim.sub', v_user_admin::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_admin)::text, true);
  BEGIN
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, localizacao_destino_id, data_movimento
    ) VALUES (
      v_empresa_id, v_produto_id, 'ENTRADA', 1, v_localizacao_id, v_data_retroativa
    );
    RETURN NEXT 'OK: admin passa mesmo com limite ativo e data retroativa';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'FALHA: admin deveria sempre passar (' || SQLERRM || ')';
  END;

  -- ===== Caso 5: dentro da janela de 48h uteis, usuario estranho passa sem permissao =====
  PERFORM set_config('request.jwt.claim.sub', v_user_estranho::text, true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_estranho)::text, true);
  BEGIN
    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, localizacao_destino_id, data_movimento
    ) VALUES (
      v_empresa_id, v_produto_id, 'ENTRADA', 1, v_localizacao_id, now() - interval '2 hours'
    );
    RETURN NEXT 'OK: data recente (2h atras) passa mesmo sem permissao (dentro da janela)';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'FALHA: data recente nao deveria ser bloqueada (' || SQLERRM || ')';
  END;

  -- ===== Caso 6: vendas, mesmo teste =====
  BEGIN
    INSERT INTO public.vendas (empresa_representada_id, data_venda, valor_total, status)
    VALUES (v_empresa_id, (v_data_retroativa)::date, 100, 'RASCUNHO');
    RETURN NEXT 'FALHA: insert retroativo em vendas deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: vendas recusou insert retroativo sem permissao (' || SQLERRM || ')';
  END;

  -- ===== Caso 7: movimentacoes_bancarias, mesmo teste =====
  BEGIN
    INSERT INTO public.movimentacoes_bancarias (empresa_representada_id, tipo, valor, data_movimentacao, descricao)
    VALUES (v_empresa_id, 'ENTRADA', 50, v_data_retroativa, 'teste prova perm1');
    RETURN NEXT 'FALHA: insert retroativo em movimentacoes_bancarias deveria ter sido recusado';
  EXCEPTION WHEN OTHERS THEN
    RETURN NEXT 'OK: movimentacoes_bancarias recusou insert retroativo sem permissao (' || SQLERRM || ')';
  END;
END;
$$;

SELECT * FROM pg_temp.prova_retroativo();

ROLLBACK;
