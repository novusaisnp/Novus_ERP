-- =====================================================================
-- AUDITORIA_NOVA.md — Fase 1.5, continuação: as 4 tabelas que o sweep
-- mecânico (20260816130000) deixou de fora por não terem coluna direta
-- empresa_representada_id.
--
-- empresas_representadas: a própria linha É a empresa (id, não
-- empresa_representada_id). UPDATE/SELECT ficam escopados ao admin da
-- própria empresa via has_role_for_empresa(..., id). INSERT/DELETE viram
-- novus_owner: criar ou apagar um tenant inteiro é ação de plataforma, não
-- algo que o admin de uma empresa cliente deveria fazer por si mesma (nem
-- por si, nem por outra) — hoje qualquer admin podia criar/apagar QUALQUER
-- empresa, inclusive a de outro cliente.
--
-- entidade_dados_colaborador: empresa vem via subquery em entidades (e),
-- não coluna direta na própria tabela — troca dentro do EXISTS.
--
-- report_ops_alerts / report_ops_audit: dado de monitoramento da
-- infraestrutura de relatórios agendados (report_schedules), sem coluna de
-- tenant — confirmado que report_schedules também não tem
-- empresa_representada_id. Não é dado de cliente, é operação interna
-- NOVUS; vira novus_owner, não admin de empresa. RelatoriosOps.tsx (rota
-- /configuracoes/relatorios-ops) segue a mesma direção no código.
-- =====================================================================

ALTER POLICY "Admins atualizam empresas_representadas" ON public.empresas_representadas
  USING (has_role_for_empresa(auth.uid(), 'admin'::app_role, id))
  WITH CHECK (has_role_for_empresa(auth.uid(), 'admin'::app_role, id));

ALTER POLICY "Admins deletam empresas_representadas" ON public.empresas_representadas
  RENAME TO "novus_owner_deletam_empresas_representadas";
ALTER POLICY "novus_owner_deletam_empresas_representadas" ON public.empresas_representadas
  USING (has_role(auth.uid(), 'novus_owner'::app_role));

ALTER POLICY "Admins inserem empresas_representadas" ON public.empresas_representadas
  RENAME TO "novus_owner_inserem_empresas_representadas";
ALTER POLICY "novus_owner_inserem_empresas_representadas" ON public.empresas_representadas
  WITH CHECK (has_role(auth.uid(), 'novus_owner'::app_role));

ALTER POLICY "Usuário vê sua empresa vinculada" ON public.empresas_representadas
  USING (user_has_access_to_empresa(id) OR has_role_for_empresa(auth.uid(), 'admin'::app_role, id));

ALTER POLICY "entidade_dados_colaborador_select_empresa" ON public.entidade_dados_colaborador
  USING (EXISTS (
    SELECT 1 FROM entidades e
    WHERE e.id = entidade_dados_colaborador.entidade_id
      AND (e.empresa_representada_id = get_user_empresa_id()
           OR has_role_for_empresa(auth.uid(), 'admin'::app_role, e.empresa_representada_id))
  ));

ALTER POLICY "entidade_dados_colaborador_write_empresa" ON public.entidade_dados_colaborador
  USING (EXISTS (
    SELECT 1 FROM entidades e
    WHERE e.id = entidade_dados_colaborador.entidade_id
      AND (e.empresa_representada_id = get_user_empresa_id()
           OR has_role_for_empresa(auth.uid(), 'admin'::app_role, e.empresa_representada_id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM entidades e
    WHERE e.id = entidade_dados_colaborador.entidade_id
      AND (e.empresa_representada_id = get_user_empresa_id()
           OR has_role_for_empresa(auth.uid(), 'admin'::app_role, e.empresa_representada_id))
  ));

ALTER POLICY "Admins can ack ops alerts" ON public.report_ops_alerts
  USING (has_role(auth.uid(), 'novus_owner'::app_role))
  WITH CHECK (has_role(auth.uid(), 'novus_owner'::app_role));

ALTER POLICY "Admins can view ops alerts" ON public.report_ops_alerts
  USING (has_role(auth.uid(), 'novus_owner'::app_role));

ALTER POLICY "Admins can view all ops audit" ON public.report_ops_audit
  USING (has_role(auth.uid(), 'novus_owner'::app_role));

ALTER POLICY "Admins insert own alert_ack audit" ON public.report_ops_audit
  WITH CHECK (action = 'alert_ack'::text AND actor_user_id = auth.uid() AND has_role(auth.uid(), 'novus_owner'::app_role));
