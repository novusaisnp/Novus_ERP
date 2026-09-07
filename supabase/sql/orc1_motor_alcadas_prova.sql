-- Prova do motor de alçadas (ORC-1) — dado sintético + mutação temporária de
-- role/perfil de 2 usuários reais (tudo dentro de BEGIN...ROLLBACK, nada persiste).
-- Cobre: auto-aprovação sem alçada, alçada configurada -> PENDENTE, segregação
-- solicitante x aprovador (inclusive para admin), aprovação via admin, aprovação
-- via has_permissao (sem admin), rejeição por falta de permissão, substituição
-- ativa autorizando, substituição fora de escopo (categoria) não autorizando,
-- cancelamento pelo próprio solicitante, e decidir/cancelar uma solicitação já
-- decidida (deve falhar).
--
-- Função temporária (pg_temp, some com a sessão/rollback) que RETURNs cada
-- checkpoint como linha de texto — a via --linked (Management API) não repassa
-- RAISE NOTICE ao cliente, então o log precisa viajar como resultado de query.

CREATE FUNCTION pg_temp.prova_orc1() RETURNS SETOF text
LANGUAGE plpgsql
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_a uuid := 'e31a7fa6-5c0d-46ad-bd8a-0ebcd06bd8a1'; -- MAXWELL (admin real)
  v_user_b uuid := '7592b882-d97a-4283-a49c-a41c46de05dd'; -- MANOEL (admin real)
  v_alcada_id uuid;
  v_r1 jsonb; v_r2 jsonb; v_r3 jsonb; v_r4 jsonb; v_r5 jsonb; v_r6 jsonb; v_r7 jsonb;
  v_res jsonb;
  v_subst_id uuid;
  v_sol record;
BEGIN
  SELECT id INTO v_empresa_id FROM public.empresas_representadas WHERE id = (
    SELECT empresa_representada_id FROM public.usuarios WHERE user_id = v_user_a
  );
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Empresa dos usuários de teste não encontrada';
  END IF;
  RETURN NEXT format('OK: empresa de teste = %s', v_empresa_id);

  -- ── 1) sem alçada configurada -> AUTO_APROVADO ────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_r1 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_SEMALCADA', 500, 'Prova sem alçada configurada');
  IF v_r1->>'status' <> 'AUTO_APROVADO' THEN
    RAISE EXCEPTION 'Esperado AUTO_APROVADO, veio %', v_r1->>'status';
  END IF;
  RETURN NEXT 'OK: solicitação sem alçada configurada foi AUTO_APROVADO';

  -- ── 2) configura alçada e confere resolver_alcada ─────────────────────────
  INSERT INTO public.alcadas_aprovacao (empresa_representada_id, categoria, valor_minimo, permissao_necessaria, descricao)
  VALUES (v_empresa_id, 'PROVA_ORC1_COMPRAS', 1000, 'compras.aprovacao', 'Alçada de teste ORC-1')
  RETURNING id INTO v_alcada_id;

  IF (public.resolver_alcada(v_empresa_id, 'PROVA_ORC1_COMPRAS', 999)).id IS NOT NULL THEN
    RAISE EXCEPTION 'resolver_alcada não deveria achar faixa para valor abaixo do mínimo';
  END IF;
  IF (public.resolver_alcada(v_empresa_id, 'PROVA_ORC1_COMPRAS', 1000)).id <> v_alcada_id THEN
    RAISE EXCEPTION 'resolver_alcada não achou a faixa esperada para valor no limiar';
  END IF;
  RETURN NEXT 'OK: resolver_alcada respeita o limiar (abaixo=nenhuma, no limiar=achou)';

  -- ── 3) acima da alçada -> PENDENTE ─────────────────────────────────────────
  v_r2 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 5000, 'Prova acima da alçada (R2)');
  IF v_r2->>'status' <> 'PENDENTE' THEN
    RAISE EXCEPTION 'Esperado PENDENTE, veio %', v_r2->>'status';
  END IF;
  RETURN NEXT 'OK: solicitação acima da alçada abriu PENDENTE';

  -- ── 4) segregação: solicitante não decide a própria solicitação ──────────
  BEGIN
    PERFORM public.decidir_solicitacao((v_r2->>'solicitacao_id')::uuid, 'APROVADO', NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: deveria ter bloqueado por segregação de funções';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'SEGREGACAO_FUNCOES%' THEN
        RETURN NEXT format('OK: solicitante tentando decidir a própria solicitação foi bloqueado (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- ── 5) aprovação via admin (userB, ainda admin nesse ponto) ───────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  v_res := public.decidir_solicitacao((v_r2->>'solicitacao_id')::uuid, 'APROVADO', NULL);
  IF v_res->>'status' <> 'APROVADO' THEN RAISE EXCEPTION 'Aprovação via admin falhou: %', v_res; END IF;
  RETURN NEXT 'OK: admin aprovou a solicitação de outro usuário';

  -- ── 6) já decidida -> não pode decidir de novo ────────────────────────────
  BEGIN
    PERFORM public.decidir_solicitacao((v_r2->>'solicitacao_id')::uuid, 'REJEITADO', 'tentativa dupla');
    RAISE EXCEPTION 'FALHA_DA_PROVA: deveria ter bloqueado decisão duplicada';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'SOLICITACAO_JA_DECIDIDA%' THEN
        RETURN NEXT format('OK: decisão duplicada foi bloqueada (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- ── 7) demove userB de admin (mantém acesso à empresa via role operador) ─
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true); -- volta pra dono da sessão de setup
  UPDATE public.user_roles SET role = 'operador'
  WHERE user_id = v_user_b AND role = 'admin' AND empresa_representada_id = v_empresa_id;

  v_r3 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 6000, 'Prova aprovação via has_permissao (R3)');

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  v_res := public.decidir_solicitacao((v_r3->>'solicitacao_id')::uuid, 'APROVADO', NULL);
  IF v_res->>'status' <> 'APROVADO' THEN
    RAISE EXCEPTION 'Aprovação via has_permissao (userB não-admin, com perfil) falhou: %', v_res;
  END IF;
  RETURN NEXT 'OK: usuário não-admin aprovou via has_permissao (perfil com compras.aprovacao)';

  -- ── 8) tira o perfil de userB -> sem admin e sem permissão -> deve falhar ─
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  UPDATE public.usuarios SET perfil_id = NULL WHERE user_id = v_user_b;

  v_r4 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 7000, 'Prova rejeição por falta de permissão (R4)');

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.decidir_solicitacao((v_r4->>'solicitacao_id')::uuid, 'APROVADO', NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: deveria ter bloqueado por falta de permissão';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PERMISSAO_INSUFICIENTE%' THEN
        RETURN NEXT format('OK: aprovador sem admin/permissão/substituição foi bloqueado (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- ── 9) substituição ativa (titular=userA, substituto=userB) autoriza ─────
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  INSERT INTO public.alcadas_substitutos (
    empresa_representada_id, aprovador_titular_id, aprovador_substituto_id,
    categoria, data_inicio, data_fim, motivo, criado_por
  ) VALUES (
    v_empresa_id, v_user_a, v_user_b,
    'PROVA_ORC1_COMPRAS', CURRENT_DATE, CURRENT_DATE, 'Prova de substituição ORC-1', v_user_a
  ) RETURNING id INTO v_subst_id;

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  v_res := public.decidir_solicitacao((v_r4->>'solicitacao_id')::uuid, 'APROVADO', NULL);
  IF v_res->>'status' <> 'APROVADO' THEN
    RAISE EXCEPTION 'Aprovação via substituição falhou: %', v_res;
  END IF;
  SELECT * INTO v_sol FROM public.solicitacoes_aprovacao WHERE id = (v_r4->>'solicitacao_id')::uuid;
  IF v_sol.substituicao_id <> v_subst_id THEN
    RAISE EXCEPTION 'solicitacao aprovada não registrou a substituicao_id usada';
  END IF;
  RETURN NEXT 'OK: substituto aprovou em nome do titular, substituicao_id registrada na auditoria';

  -- ── 10) substituição fora de escopo (categoria diferente) não autoriza ───
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_r5 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 8000, 'Prova substituição fora de escopo (R5)');
  UPDATE public.alcadas_substitutos SET categoria = 'PROVA_ORC1_OUTRA_CATEGORIA' WHERE id = v_subst_id;

  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.decidir_solicitacao((v_r5->>'solicitacao_id')::uuid, 'APROVADO', NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: substituição de outra categoria não deveria autorizar';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'PERMISSAO_INSUFICIENTE%' THEN
        RETURN NEXT format('OK: substituição de categoria diferente corretamente não autorizou (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- ── 11) rejeição exige justificativa ──────────────────────────────────────
  UPDATE public.alcadas_substitutos SET categoria = 'PROVA_ORC1_COMPRAS' WHERE id = v_subst_id; -- devolve escopo
  BEGIN
    PERFORM public.decidir_solicitacao((v_r5->>'solicitacao_id')::uuid, 'REJEITADO', NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: rejeição sem justificativa deveria ter sido bloqueada';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'JUSTIFICATIVA_OBRIGATORIA%' THEN
        RETURN NEXT format('OK: rejeição sem justificativa foi bloqueada (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;
  v_res := public.decidir_solicitacao((v_r5->>'solicitacao_id')::uuid, 'REJEITADO', 'Motivo de teste da rejeição');
  IF v_res->>'status' <> 'REJEITADO' THEN RAISE EXCEPTION 'Rejeição com justificativa falhou: %', v_res; END IF;
  RETURN NEXT 'OK: rejeição com justificativa registrada (via substituição, ainda no escopo restaurado)';

  -- ── 12) cancelamento pelo próprio solicitante ─────────────────────────────
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  v_r6 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 9000, 'Prova de cancelamento (R6)');
  v_res := public.cancelar_solicitacao_aprovacao((v_r6->>'solicitacao_id')::uuid);
  IF v_res->>'status' <> 'CANCELADO' THEN RAISE EXCEPTION 'Cancelamento falhou: %', v_res; END IF;

  BEGIN
    PERFORM public.decidir_solicitacao((v_r6->>'solicitacao_id')::uuid, 'APROVADO', NULL);
    RAISE EXCEPTION 'FALHA_DA_PROVA: não deveria decidir solicitação cancelada';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'SOLICITACAO_JA_DECIDIDA%' THEN
        RETURN NEXT format('OK: solicitação cancelada não pode mais ser decidida (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  -- ── 13) cancelamento por quem não é o solicitante -> bloqueado ───────────
  v_r7 := public.solicitar_aprovacao(v_empresa_id, 'PROVA_ORC1_COMPRAS', 9500, 'Prova de cancelamento por terceiro (R7)');
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  BEGIN
    PERFORM public.cancelar_solicitacao_aprovacao((v_r7->>'solicitacao_id')::uuid);
    RAISE EXCEPTION 'FALHA_DA_PROVA: terceiro não deveria poder cancelar a solicitação de outro';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLSTATE = '42501' THEN
        RETURN NEXT format('OK: terceiro foi bloqueado ao tentar cancelar solicitação alheia (%s)', SQLERRM);
      ELSE
        RAISE;
      END IF;
  END;

  RETURN NEXT 'PROVA ORC-1 COMPLETA — todas as asserções passaram';
END;
$$;

SELECT * FROM pg_temp.prova_orc1();
