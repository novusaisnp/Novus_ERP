
-- =========================================
-- LOTE 4E — Módulo Fiscal (5 tabelas)
-- =========================================

-- 1) CFOP (catálogo público-leitura)
CREATE TABLE public.cfop (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(4) NOT NULL UNIQUE CHECK (codigo ~ '^[0-9]{4}$'),
  descricao TEXT NOT NULL,
  aplicacao TEXT,
  destino TEXT NOT NULL CHECK (destino IN ('interno','interestadual','exterior')),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cfop_codigo ON public.cfop(codigo);
CREATE INDEX idx_cfop_tipo_destino ON public.cfop(tipo, destino);

GRANT SELECT ON public.cfop TO authenticated;
GRANT ALL ON public.cfop TO service_role;
ALTER TABLE public.cfop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cfop_read_authenticated" ON public.cfop
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "cfop_admin_write" ON public.cfop
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) NCM (catálogo público-leitura)
CREATE TABLE public.ncm (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10) NOT NULL UNIQUE CHECK (codigo ~ '^[0-9]{8}$'),
  descricao TEXT NOT NULL,
  unidade TEXT,
  aliquota_ipi NUMERIC(5,2) NOT NULL DEFAULT 0,
  categoria TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ncm_codigo ON public.ncm(codigo);

GRANT SELECT ON public.ncm TO authenticated;
GRANT ALL ON public.ncm TO service_role;
ALTER TABLE public.ncm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ncm_read_authenticated" ON public.ncm
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ncm_admin_write" ON public.ncm
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Tributos (multi-tenant)
CREATE TABLE public.tributos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ICMS','IPI','PIS','COFINS','ISS','CSLL','IRPJ')),
  subtipo TEXT CHECK (subtipo IN ('normal','substituicao','diferido','isento')),
  aliquota NUMERIC(5,2) NOT NULL DEFAULT 0,
  base_calculo NUMERIC(5,2) NOT NULL DEFAULT 100,
  uf CHAR(2),
  regime_tributario TEXT,
  ncm_inicio VARCHAR(10),
  ncm_fim VARCHAR(10),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tributos_data_fim_gte_inicio CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);
CREATE INDEX idx_tributos_empresa ON public.tributos(empresa_representada_id);
CREATE INDEX idx_tributos_tipo ON public.tributos(tipo);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tributos TO authenticated;
GRANT ALL ON public.tributos TO service_role;
ALTER TABLE public.tributos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tributos_tenant_select" ON public.tributos
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tributos_tenant_insert" ON public.tributos
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tributos_tenant_update" ON public.tributos
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tributos_tenant_delete" ON public.tributos
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_tributos_updated
  BEFORE UPDATE ON public.tributos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Natureza de Operação (multi-tenant, FK CFOP)
CREATE TABLE public.natureza_operacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('venda','compra','remessa','devolucao','transferencia')),
  finalidade TEXT NOT NULL CHECK (finalidade IN ('normal','complementar','ajuste','devolucao')),
  cfop_dentro_estado VARCHAR(4) REFERENCES public.cfop(codigo),
  cfop_fora_estado VARCHAR(4) REFERENCES public.cfop(codigo),
  cfop_exterior VARCHAR(4) REFERENCES public.cfop(codigo),
  gera_duplicata BOOLEAN NOT NULL DEFAULT false,
  movimenta_estoque BOOLEAN NOT NULL DEFAULT true,
  calcula_icms BOOLEAN NOT NULL DEFAULT true,
  calcula_ipi BOOLEAN NOT NULL DEFAULT false,
  calcula_pis_cofins BOOLEAN NOT NULL DEFAULT true,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_representada_id, codigo)
);
CREATE INDEX idx_natop_empresa ON public.natureza_operacao(empresa_representada_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.natureza_operacao TO authenticated;
GRANT ALL ON public.natureza_operacao TO service_role;
ALTER TABLE public.natureza_operacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "natop_tenant_select" ON public.natureza_operacao
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natop_tenant_insert" ON public.natureza_operacao
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natop_tenant_update" ON public.natureza_operacao
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natop_tenant_delete" ON public.natureza_operacao
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_natop_updated
  BEFORE UPDATE ON public.natureza_operacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Configurações Fiscais (multi-tenant, 1:1 com empresa)
CREATE TABLE public.configuracoes_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL UNIQUE REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  ambiente TEXT NOT NULL DEFAULT 'Teste' CHECK (ambiente IN ('Teste','Producao')),
  certificado_digital TEXT,
  senha_certificado TEXT,
  regime_tributario TEXT NOT NULL CHECK (regime_tributario IN ('Simples Nacional','Lucro Presumido','Lucro Real')),
  aliquota_icms_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
  aliquota_ipi_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
  aliquota_pis_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
  aliquota_cofins_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
  aliquota_iss_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
  serie_nfe VARCHAR(3) NOT NULL DEFAULT '1',
  numero_ultimo_nfe INTEGER NOT NULL DEFAULT 0,
  serie_nfce VARCHAR(3) NOT NULL DEFAULT '1',
  numero_ultimo_nfce INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_configfisc_empresa ON public.configuracoes_fiscais(empresa_representada_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_fiscais TO authenticated;
GRANT ALL ON public.configuracoes_fiscais TO service_role;
ALTER TABLE public.configuracoes_fiscais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "configfisc_tenant_select" ON public.configuracoes_fiscais
  FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "configfisc_tenant_insert" ON public.configuracoes_fiscais
  FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "configfisc_tenant_update" ON public.configuracoes_fiscais
  FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "configfisc_tenant_delete" ON public.configuracoes_fiscais
  FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_configfisc_updated
  BEFORE UPDATE ON public.configuracoes_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
