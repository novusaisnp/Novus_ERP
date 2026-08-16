-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 6: autorização de verdade. Bloco 5 já apontava
-- que /configuracoes/webhooks só tinha ProtectedRoute, mas a investigação
-- desta migration achou que o problema é mais fundo — não é só a rota sem
-- gate, é a RLS em si: webhook_configs e folha_pagamento usavam o mesmo
-- padrão largo (`user_has_access_to_empresa OR admin`) nas 4 operações
-- (SELECT/INSERT/UPDATE/DELETE), igual a usuarios/empresas_representadas.
--
-- Decisão do usuário (2026-08-16): diferente de usuarios/empresas (diretório
-- de equipe/dados da empresa — ok qualquer funcionário ver), segredo HMAC e
-- salário não têm por que ser lidos por qualquer funcionário. Como a mesma
-- regra larga também cobria escrita (não só leitura), a correção fecha as
-- 4 operações — deixar INSERT/UPDATE/DELETE abertos pra ninguém-exceto-quem-
-- deveria-ler seria inconsistente com o motivo da restrição.
-- =====================================================================

ALTER POLICY "webhook_configs_select" ON public.webhook_configs
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "webhook_configs_insert" ON public.webhook_configs
  WITH CHECK (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "webhook_configs_update" ON public.webhook_configs
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "webhook_configs_delete" ON public.webhook_configs
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "fp_select" ON public.folha_pagamento
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "fp_insert" ON public.folha_pagamento
  WITH CHECK (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "fp_update" ON public.folha_pagamento
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));

ALTER POLICY "fp_delete" ON public.folha_pagamento
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, empresa_representada_id));
