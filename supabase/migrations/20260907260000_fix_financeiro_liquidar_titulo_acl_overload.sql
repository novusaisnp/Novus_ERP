-- Corrige uma regressao real introduzida pela migration anterior
-- (20260907250000_fin1_vincular_movimentacao_existente.sql): o CREATE OR
-- REPLACE que acrescentou p_movimentacao_bancaria_id NAO substituiu a funcao
-- original — Postgres identifica uma funcao pelo NOME + LISTA DE TIPOS dos
-- parametros de entrada, e acrescentar um parametro muda essa lista, então
-- CREATE OR REPLACE criou uma SEGUNDA sobrecarga (14 args) em vez de
-- substituir a de 13. Duas consequencias reais:
--
-- 1) A versao antiga (13 args) ficou parada no ar, inalcancavel por chamada
--    nomeada (o app sempre envia p_movimentacao_bancaria_id), mas ambigua
--    para qualquer chamada posicional (inclusive as provas SQL desta sessao)
--    — "function ... is not unique".
-- 2) MAIS GRAVE: a funcao nova (14 args), por ser um objeto novo, NAO herdou
--    o ACL travado da antiga — pegou o default do schema, que aqui inclui
--    EXECUTE para PUBLIC e para `anon`. `financeiro_liquidar_titulo` virou
--    chamavel por qualquer requisicao com a anon key, sem login nenhum
--    (mitigado em runtime pelo `IF auth.uid() IS NULL THEN RAISE EXCEPTION`
--    logo no topo do corpo, mas contraria a convencao desta sessao de nunca
--    depender só da checagem em runtime — REVOKE FROM PUBLIC/anon é
--    obrigatorio em toda funcao nova, ver feedback_revoke_execute_from_public
--    na memoria).
--
-- Fix: remove a sobrecarga de 13 args (nada mais a chama — unico "caller"
-- encontrado via grep no prosrc de todas as funcoes é um comentario em
-- lancar_liquidacao_titulo, não uma chamada real) e tranca o ACL da de 14.

DROP FUNCTION IF EXISTS public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric
);

REVOKE ALL ON FUNCTION public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.financeiro_liquidar_titulo(
  uuid, text, numeric, date, text, uuid, uuid, text, jsonb, uuid, numeric, numeric, numeric, uuid
) TO authenticated, service_role;

DO $$
DECLARE
  v_count int;
  v_acl aclitem[];
BEGIN
  SELECT count(*) INTO v_count FROM pg_proc WHERE proname = 'financeiro_liquidar_titulo';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'esperado exatamente 1 sobrecarga de financeiro_liquidar_titulo, encontrado %', v_count;
  END IF;

  SELECT proacl INTO v_acl FROM pg_proc WHERE proname = 'financeiro_liquidar_titulo';
  IF EXISTS (SELECT 1 FROM unnest(v_acl) a WHERE a::text LIKE '=X%') THEN
    RAISE EXCEPTION 'financeiro_liquidar_titulo ainda tem EXECUTE para PUBLIC';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_acl) a WHERE a::text LIKE 'anon=%') THEN
    RAISE EXCEPTION 'financeiro_liquidar_titulo ainda tem EXECUTE para anon';
  END IF;
END $$;
