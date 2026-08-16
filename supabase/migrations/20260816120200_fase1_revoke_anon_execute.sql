-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.4/1: reduzir superfície de ataque das RPCs.
-- 44 funções SECURITY DEFINER com EXECUTE concedido a anon (levantamento
-- ao vivo desta migration encontrou 43, não 44 — diferença de contagem
-- irrelevante, o alvo é "todas que estiverem concedidas no momento").
-- A maioria checa auth.uid() internamente, mas o GRANT em si amplia a
-- superfície desnecessariamente: deveria ser authenticated, não anon.
--
-- Achado ao investigar (não estava no documento da auditoria): 26 das 43
-- funções concedem EXECUTE a anon só por herança do grant padrão do
-- Postgres a PUBLIC (toda função nova recebe EXECUTE TO PUBLIC a menos
-- que seja revogado explicitamente) — revogar só "FROM anon" seria noop
-- nessas 26. Por isso este script revoga de PUBLIC e de anon juntos.
-- Confirmado ao vivo, antes desta migration, que as 43 têm GRANT explícito
-- para authenticated e service_role independente do grant a PUBLIC — a
-- revogação abaixo não afeta o caminho legítimo.
--
-- Gerado dinamicamente a partir do catálogo real (pg_proc), não por lista
-- fixa de nomes: cobre exatamente o que está concedido agora, sem exigir
-- manutenção manual se a lista mudar entre a auditoria e a aplicação.
-- =====================================================================

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon;',
      fn.nspname, fn.proname, fn.args
    );
  END LOOP;
END $$;
