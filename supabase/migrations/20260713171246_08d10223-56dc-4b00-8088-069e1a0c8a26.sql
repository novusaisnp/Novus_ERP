
-- ============================================================
-- P13.1: MÓDULO FISCAL — SCHEMA BASE
-- ============================================================

-- =========================
-- 1) fiscal_configuracoes
-- =========================
CREATE TABLE public.fiscal_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL UNIQUE REFERENCES public.empresas_representadas(id),
  regime_tributario varchar(30) NOT NULL DEFAULT 'SIMPLES_NACIONAL'
    CHECK (regime_tributario IN ('SIMPLES_NACIONAL','LUCRO_PRESUMIDO','LUCRO_REAL','MEI')),
  ambiente varchar(20) NOT NULL DEFAULT 'HOMOLOGACAO'
    CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  provedor varchar(30) NOT NULL DEFAULT 'FOCUS_NFE'
    CHECK (provedor IN ('FOCUS_NFE','NFEIO','MIGRATE','TECNOSPEED','OUTRO')),
  cnpj_emitente varchar(20),
  inscricao_estadual varchar(30),
  inscricao_municipal varchar(30),
  serie_nfe integer DEFAULT 1,
  serie_nfce integer DEFAULT 1,
  proximo_numero_nfe bigint DEFAULT 1,
  proximo_numero_nfce bigint DEFAULT 1,
  csc_id varchar(10),
  csc_token_secret_ref varchar(100),
  certificado_secret_ref varchar(100),
  certificado_validade timestamptz,
  certificado_cnpj varchar(20),
  emissoes_mes integer NOT NULL DEFAULT 0,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_configuracoes TO authenticated;
GRANT ALL ON public.fiscal_configuracoes TO service_role;
ALTER TABLE public.fiscal_configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_cfg_select" ON public.fiscal_configuracoes FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_cfg_insert" ON public.fiscal_configuracoes FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_cfg_update" ON public.fiscal_configuracoes FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_cfg_delete" ON public.fiscal_configuracoes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_fiscal_cfg_updated BEFORE UPDATE ON public.fiscal_configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2) fiscal_documentos_eletronicos
-- =========================
CREATE TABLE public.fiscal_documentos_eletronicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  tipo varchar(10) NOT NULL CHECK (tipo IN ('NFE','NFCE','NFSE')),
  modelo integer CHECK (modelo IN (55, 65)),
  serie integer NOT NULL DEFAULT 1,
  numero bigint,
  chave_acesso varchar(44),
  protocolo_autorizacao varchar(50),
  data_emissao timestamptz NOT NULL DEFAULT now(),
  data_autorizacao timestamptz,
  natureza_operacao_id uuid REFERENCES public.natureza_operacao(id),
  venda_id uuid REFERENCES public.vendas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  ambiente varchar(20) NOT NULL DEFAULT 'HOMOLOGACAO'
    CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  valor_produtos numeric(15,2) NOT NULL DEFAULT 0,
  valor_frete numeric(15,2) NOT NULL DEFAULT 0,
  valor_desconto numeric(15,2) NOT NULL DEFAULT 0,
  valor_outras_despesas numeric(15,2) NOT NULL DEFAULT 0,
  valor_total numeric(15,2) NOT NULL DEFAULT 0,
  valor_icms numeric(15,2) NOT NULL DEFAULT 0,
  valor_icms_st numeric(15,2) NOT NULL DEFAULT 0,
  valor_ipi numeric(15,2) NOT NULL DEFAULT 0,
  valor_pis numeric(15,2) NOT NULL DEFAULT 0,
  valor_cofins numeric(15,2) NOT NULL DEFAULT 0,
  status varchar(25) NOT NULL DEFAULT 'RASCUNHO'
    CHECK (status IN ('RASCUNHO','EM_PROCESSAMENTO','AUTORIZADA','DENEGADA','REJEITADA','CANCELADA','INUTILIZADA')),
  motivo_rejeicao text,
  xml_url text,
  pdf_danfe_url text,
  provedor_id_externo varchar(100),
  payload_provedor jsonb,
  idempotency_key varchar(120),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT chk_chave_acesso CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44}$')
);

CREATE UNIQUE INDEX uq_fiscal_doc_chave ON public.fiscal_documentos_eletronicos(chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE UNIQUE INDEX uq_fiscal_doc_idem ON public.fiscal_documentos_eletronicos(empresa_representada_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_fiscal_doc_empresa_data ON public.fiscal_documentos_eletronicos(empresa_representada_id, data_emissao DESC);
CREATE INDEX idx_fiscal_doc_status ON public.fiscal_documentos_eletronicos(status) WHERE status IN ('EM_PROCESSAMENTO','REJEITADA');
CREATE INDEX idx_fiscal_doc_venda ON public.fiscal_documentos_eletronicos(venda_id) WHERE venda_id IS NOT NULL;
CREATE INDEX idx_fiscal_doc_cliente ON public.fiscal_documentos_eletronicos(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_fiscal_doc_deleted ON public.fiscal_documentos_eletronicos(deleted_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_documentos_eletronicos TO authenticated;
GRANT ALL ON public.fiscal_documentos_eletronicos TO service_role;
ALTER TABLE public.fiscal_documentos_eletronicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_doc_select" ON public.fiscal_documentos_eletronicos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_insert" ON public.fiscal_documentos_eletronicos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_update" ON public.fiscal_documentos_eletronicos FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_delete" ON public.fiscal_documentos_eletronicos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_fiscal_doc_updated BEFORE UPDATE ON public.fiscal_documentos_eletronicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3) fiscal_documentos_eletronicos_itens
-- =========================
CREATE TABLE public.fiscal_documentos_eletronicos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  documento_id uuid NOT NULL REFERENCES public.fiscal_documentos_eletronicos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 1,
  produto_id uuid REFERENCES public.produtos(id),
  servico_id uuid REFERENCES public.servicos(id),
  descricao text NOT NULL,
  ncm varchar(10),
  cfop varchar(5),
  cest varchar(10),
  unidade varchar(10),
  quantidade numeric(15,4) NOT NULL,
  valor_unitario numeric(15,4) NOT NULL,
  valor_total numeric(15,2) NOT NULL,
  valor_desconto numeric(15,2) NOT NULL DEFAULT 0,
  origem_mercadoria varchar(2),
  -- ICMS
  icms_cst varchar(4),
  icms_base numeric(15,2) DEFAULT 0,
  icms_aliquota numeric(6,4) DEFAULT 0,
  icms_valor numeric(15,2) DEFAULT 0,
  icms_st_base numeric(15,2) DEFAULT 0,
  icms_st_aliquota numeric(6,4) DEFAULT 0,
  icms_st_valor numeric(15,2) DEFAULT 0,
  -- IPI
  ipi_cst varchar(4),
  ipi_aliquota numeric(6,4) DEFAULT 0,
  ipi_valor numeric(15,2) DEFAULT 0,
  -- PIS
  pis_cst varchar(4),
  pis_aliquota numeric(6,4) DEFAULT 0,
  pis_valor numeric(15,2) DEFAULT 0,
  -- COFINS
  cofins_cst varchar(4),
  cofins_aliquota numeric(6,4) DEFAULT 0,
  cofins_valor numeric(15,2) DEFAULT 0,
  informacoes_adicionais text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (documento_id, ordem),
  CHECK (produto_id IS NOT NULL OR servico_id IS NOT NULL)
);

CREATE INDEX idx_fiscal_doc_itens_doc ON public.fiscal_documentos_eletronicos_itens(documento_id);
CREATE INDEX idx_fiscal_doc_itens_produto ON public.fiscal_documentos_eletronicos_itens(produto_id) WHERE produto_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_documentos_eletronicos_itens TO authenticated;
GRANT ALL ON public.fiscal_documentos_eletronicos_itens TO service_role;
ALTER TABLE public.fiscal_documentos_eletronicos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_doc_it_select" ON public.fiscal_documentos_eletronicos_itens FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_it_insert" ON public.fiscal_documentos_eletronicos_itens FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_it_update" ON public.fiscal_documentos_eletronicos_itens FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_doc_it_delete" ON public.fiscal_documentos_eletronicos_itens FOR DELETE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_fiscal_doc_it_updated BEFORE UPDATE ON public.fiscal_documentos_eletronicos_itens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4) fiscal_eventos (log imutável)
-- =========================
CREATE TABLE public.fiscal_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  documento_id uuid NOT NULL REFERENCES public.fiscal_documentos_eletronicos(id) ON DELETE CASCADE,
  tipo varchar(25) NOT NULL CHECK (tipo IN ('CANCELAMENTO','CARTA_CORRECAO','INUTILIZACAO','CONSULTA','MANIFESTACAO')),
  sequencia integer NOT NULL DEFAULT 1,
  justificativa text,
  protocolo varchar(50),
  status varchar(25) NOT NULL DEFAULT 'PROCESSANDO'
    CHECK (status IN ('PROCESSANDO','REGISTRADO','REJEITADO','ERRO')),
  motivo_rejeicao text,
  payload_provedor jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fiscal_eventos_doc ON public.fiscal_eventos(documento_id, created_at DESC);
CREATE INDEX idx_fiscal_eventos_empresa ON public.fiscal_eventos(empresa_representada_id, created_at DESC);

GRANT SELECT, INSERT ON public.fiscal_eventos TO authenticated;
GRANT ALL ON public.fiscal_eventos TO service_role;
ALTER TABLE public.fiscal_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_evt_select" ON public.fiscal_eventos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_evt_insert" ON public.fiscal_eventos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));

-- =========================
-- 5) fiscal_sped_arquivos
-- =========================
CREATE TABLE public.fiscal_sped_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  tipo varchar(30) NOT NULL CHECK (tipo IN ('SPED_FISCAL','SPED_CONTRIBUICOES','ECD','ECF')),
  periodo_ini date NOT NULL,
  periodo_fim date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'GERANDO'
    CHECK (status IN ('GERANDO','GERADO','ERRO','TRANSMITIDO')),
  arquivo_url text,
  hash_sha256 varchar(64),
  linhas_geradas integer,
  erro_mensagem text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (periodo_fim >= periodo_ini)
);

CREATE INDEX idx_fiscal_sped_empresa ON public.fiscal_sped_arquivos(empresa_representada_id, periodo_ini DESC);
CREATE INDEX idx_fiscal_sped_status ON public.fiscal_sped_arquivos(status) WHERE status IN ('GERANDO','ERRO');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_sped_arquivos TO authenticated;
GRANT ALL ON public.fiscal_sped_arquivos TO service_role;
ALTER TABLE public.fiscal_sped_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_sped_select" ON public.fiscal_sped_arquivos FOR SELECT TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_sped_insert" ON public.fiscal_sped_arquivos FOR INSERT TO authenticated
  WITH CHECK (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_sped_update" ON public.fiscal_sped_arquivos FOR UPDATE TO authenticated
  USING (public.user_has_access_to_empresa(empresa_representada_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "fiscal_sped_delete" ON public.fiscal_sped_arquivos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_fiscal_sped_updated BEFORE UPDATE ON public.fiscal_sped_arquivos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 6) Storage policies for bucket 'fiscal-documentos' (privado)
--    Convenção de path: {empresa_id}/xml|pdf|sped/...
-- =========================
CREATE POLICY "fiscal_docs_storage_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fiscal-documentos'
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.user_has_access_to_empresa((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "fiscal_docs_storage_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fiscal-documentos'
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.user_has_access_to_empresa((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "fiscal_docs_storage_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fiscal-documentos'
    AND (
      public.has_role(auth.uid(),'admin')
      OR public.user_has_access_to_empresa((split_part(name, '/', 1))::uuid)
    )
  );

CREATE POLICY "fiscal_docs_storage_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fiscal-documentos'
    AND public.has_role(auth.uid(),'admin')
  );
