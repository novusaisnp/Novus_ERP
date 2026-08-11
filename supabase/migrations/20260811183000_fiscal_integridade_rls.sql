-- Repara tabelas fiscais criadas parcialmente no projeto hospedado.
-- Estado verificado antes desta migration: tabelas vazias, RLS ativo, zero policies e zero PKs.

ALTER TABLE public.fiscal_configuracoes
  ADD CONSTRAINT fiscal_configuracoes_pkey PRIMARY KEY (id),
  ADD CONSTRAINT fiscal_configuracoes_empresa_key UNIQUE (empresa_representada_id),
  ADD CONSTRAINT fiscal_configuracoes_empresa_fkey FOREIGN KEY (empresa_representada_id) REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT fiscal_configuracoes_regime_check CHECK (regime_tributario IN ('SIMPLES_NACIONAL','LUCRO_PRESUMIDO','LUCRO_REAL','MEI')),
  ADD CONSTRAINT fiscal_configuracoes_ambiente_check CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  ADD CONSTRAINT fiscal_configuracoes_provedor_check CHECK (provedor IN ('FOCUS_NFE','NFEIO','MIGRATE','TECNOSPEED','OUTRO'));

ALTER TABLE public.fiscal_documentos_eletronicos
  ADD CONSTRAINT fiscal_documentos_eletronicos_pkey PRIMARY KEY (id),
  ADD CONSTRAINT fiscal_documentos_empresa_fkey FOREIGN KEY (empresa_representada_id) REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT fiscal_documentos_venda_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id),
  ADD CONSTRAINT fiscal_documentos_cliente_fkey FOREIGN KEY (cliente_id) REFERENCES public.entidades(id),
  ADD CONSTRAINT fiscal_documentos_tipo_check CHECK (tipo IN ('NFE','NFCE','NFSE')),
  ADD CONSTRAINT fiscal_documentos_modelo_check CHECK (modelo IN (55,65)),
  ADD CONSTRAINT fiscal_documentos_ambiente_check CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  ADD CONSTRAINT fiscal_documentos_status_check CHECK (status IN ('RASCUNHO','EM_PROCESSAMENTO','AUTORIZADA','DENEGADA','REJEITADA','CANCELADA','INUTILIZADA')),
  ADD CONSTRAINT fiscal_documentos_chave_check CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44}$');

ALTER TABLE public.fiscal_documentos_eletronicos_itens
  ADD CONSTRAINT fiscal_documentos_itens_pkey PRIMARY KEY (id),
  ADD CONSTRAINT fiscal_documentos_itens_empresa_fkey FOREIGN KEY (empresa_representada_id) REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT fiscal_documentos_itens_documento_fkey FOREIGN KEY (documento_id) REFERENCES public.fiscal_documentos_eletronicos(id) ON DELETE CASCADE,
  ADD CONSTRAINT fiscal_documentos_itens_produto_fkey FOREIGN KEY (produto_id) REFERENCES public.produtos(id),
  ADD CONSTRAINT fiscal_documentos_itens_servico_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos(id),
  ADD CONSTRAINT fiscal_documentos_itens_ordem_key UNIQUE (documento_id, ordem),
  ADD CONSTRAINT fiscal_documentos_itens_origem_check CHECK (produto_id IS NOT NULL OR servico_id IS NOT NULL),
  ADD CONSTRAINT fiscal_documentos_itens_valores_check CHECK (quantidade > 0 AND valor_unitario >= 0 AND valor_total >= 0 AND valor_desconto >= 0);

ALTER TABLE public.fiscal_eventos
  ADD CONSTRAINT fiscal_eventos_pkey PRIMARY KEY (id),
  ADD CONSTRAINT fiscal_eventos_empresa_fkey FOREIGN KEY (empresa_representada_id) REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT fiscal_eventos_documento_fkey FOREIGN KEY (documento_id) REFERENCES public.fiscal_documentos_eletronicos(id) ON DELETE CASCADE,
  ADD CONSTRAINT fiscal_eventos_tipo_check CHECK (tipo IN ('autorizacao','processamento','erro_emissao','cancelamento','erro_cancelamento','cce','erro_cce','consulta','inutilizacao')),
  ADD CONSTRAINT fiscal_eventos_status_check CHECK (status IN ('processando','autorizada','rejeitada','cancelada','denegada','inutilizada','erro')),
  ADD CONSTRAINT fiscal_eventos_sequencia_check CHECK (sequencia BETWEEN 1 AND 20);

ALTER TABLE public.fiscal_sped_arquivos
  ADD CONSTRAINT fiscal_sped_arquivos_pkey PRIMARY KEY (id),
  ADD CONSTRAINT fiscal_sped_empresa_fkey FOREIGN KEY (empresa_representada_id) REFERENCES public.empresas_representadas(id),
  ADD CONSTRAINT fiscal_sped_tipo_check CHECK (tipo IN ('SPED_FISCAL','SPED_CONTRIBUICOES','ECD','ECF')),
  ADD CONSTRAINT fiscal_sped_status_check CHECK (status IN ('GERANDO','GERADO','ERRO','TRANSMITIDO')),
  ADD CONSTRAINT fiscal_sped_periodo_check CHECK (periodo_fim >= periodo_ini);

CREATE POLICY fiscal_cfg_select ON public.fiscal_configuracoes FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_cfg_insert ON public.fiscal_configuracoes FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_cfg_update ON public.fiscal_configuracoes FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_cfg_delete ON public.fiscal_configuracoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY fiscal_doc_select ON public.fiscal_documentos_eletronicos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_insert ON public.fiscal_documentos_eletronicos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_update ON public.fiscal_documentos_eletronicos FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_delete ON public.fiscal_documentos_eletronicos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY fiscal_doc_it_select ON public.fiscal_documentos_eletronicos_itens FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_it_insert ON public.fiscal_documentos_eletronicos_itens FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_it_update ON public.fiscal_documentos_eletronicos_itens FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_doc_it_delete ON public.fiscal_documentos_eletronicos_itens FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY fiscal_evt_select ON public.fiscal_eventos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_evt_insert ON public.fiscal_eventos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE POLICY fiscal_sped_select ON public.fiscal_sped_arquivos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_sped_insert ON public.fiscal_sped_arquivos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_sped_update ON public.fiscal_sped_arquivos FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY fiscal_sped_delete ON public.fiscal_sped_arquivos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
