ALTER FUNCTION public.converter_orcamento_em_venda(p_payload jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.gerar_contas_receber_da_venda(p_venda_id uuid, p_idempotency_key text) SET search_path = public, extensions;
ALTER FUNCTION public.resolver_classificacao_receita(p_item_id uuid) SET search_path = public, extensions;