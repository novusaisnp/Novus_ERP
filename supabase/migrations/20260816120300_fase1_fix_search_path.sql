-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.4/2: fixar search_path nas 4 funções que o
-- advisor de segurança aponta como mutável (vetor clássico de sequestro
-- de função via schema conflitante em banco multiusuário). Confirmado ao
-- vivo: nenhuma das 4 tinha proconfig — search_path resolvia dinâmico.
-- Padrão do repositório (69 ocorrências em migrations anteriores):
-- SET search_path = public.
-- =====================================================================

ALTER FUNCTION public.financeiro_limite_retroativo() SET search_path = public;
ALTER FUNCTION public.sync_contas_bancarias_ativo_status() SET search_path = public;
ALTER FUNCTION public.sync_movimentacoes_bancarias_legacy_fields() SET search_path = public;
ALTER FUNCTION public.validate_required_user_fields(p_email text, p_full_name text, p_phone text) SET search_path = public;
