
-- Helper macro: RLS pattern is repeated per table

-- ============================================================
-- 1. localizacoes_estoque
-- ============================================================
CREATE TABLE public.localizacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  corredor VARCHAR(50),
  prateleira VARCHAR(50),
  posicao VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localizacoes_estoque TO authenticated;
GRANT ALL ON public.localizacoes_estoque TO service_role;
ALTER TABLE public.localizacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "localizacoes_estoque_select" ON public.localizacoes_estoque FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "localizacoes_estoque_insert" ON public.localizacoes_estoque FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "localizacoes_estoque_update" ON public.localizacoes_estoque FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "localizacoes_estoque_delete" ON public.localizacoes_estoque FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_localizacoes_estoque_updated_at BEFORE UPDATE ON public.localizacoes_estoque FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_localizacoes_estoque_empresa ON public.localizacoes_estoque(empresa_representada_id);
CREATE INDEX idx_localizacoes_estoque_ativo ON public.localizacoes_estoque(ativo);

-- ============================================================
-- 2. plano_contas
-- ============================================================
CREATE TABLE public.plano_contas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) CHECK (tipo IN ('RECEITA','DESPESA','ATIVO','PASSIVO','PATRIMONIO')),
  natureza VARCHAR(20) CHECK (natureza IN ('DEVEDORA','CREDORA')),
  nivel INTEGER NOT NULL DEFAULT 1,
  conta_pai_id UUID REFERENCES public.plano_contas(id),
  aceita_lancamento BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_contas TO authenticated;
GRANT ALL ON public.plano_contas TO service_role;
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plano_contas_select" ON public.plano_contas FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plano_contas_insert" ON public.plano_contas FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plano_contas_update" ON public.plano_contas FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "plano_contas_delete" ON public.plano_contas FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_plano_contas_updated_at BEFORE UPDATE ON public.plano_contas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_plano_contas_empresa ON public.plano_contas(empresa_representada_id);
CREATE INDEX idx_plano_contas_codigo ON public.plano_contas(codigo);
CREATE INDEX idx_plano_contas_conta_pai ON public.plano_contas(conta_pai_id);
CREATE INDEX idx_plano_contas_tipo ON public.plano_contas(tipo);
CREATE INDEX idx_plano_contas_ativo ON public.plano_contas(ativo);

-- ============================================================
-- 3. centros_custo
-- ============================================================
CREATE TABLE public.centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  codigo VARCHAR(50),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  centro_pai_id UUID REFERENCES public.centros_custo(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "centros_custo_select" ON public.centros_custo FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "centros_custo_insert" ON public.centros_custo FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "centros_custo_update" ON public.centros_custo FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "centros_custo_delete" ON public.centros_custo FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_centros_custo_updated_at BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_centros_custo_empresa ON public.centros_custo(empresa_representada_id);
CREATE INDEX idx_centros_custo_ativo ON public.centros_custo(ativo);

-- ============================================================
-- 4. planos_pagamento
-- ============================================================
CREATE TABLE public.planos_pagamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  intervalo_dias INTEGER NOT NULL DEFAULT 30,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_pagamento TO authenticated;
GRANT ALL ON public.planos_pagamento TO service_role;
ALTER TABLE public.planos_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_pagamento_select" ON public.planos_pagamento FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "planos_pagamento_insert" ON public.planos_pagamento FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "planos_pagamento_update" ON public.planos_pagamento FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "planos_pagamento_delete" ON public.planos_pagamento FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_planos_pagamento_updated_at BEFORE UPDATE ON public.planos_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_planos_pagamento_empresa ON public.planos_pagamento(empresa_representada_id);
CREATE INDEX idx_planos_pagamento_ativo ON public.planos_pagamento(ativo);

-- ============================================================
-- 5. vencimentos_padrao
-- ============================================================
CREATE TABLE public.vencimentos_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50),
  valor NUMERIC(15,2) DEFAULT 0,
  percentual NUMERIC(8,4) DEFAULT 0,
  referencia VARCHAR(50),
  competencia VARCHAR(7),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vencimentos_padrao TO authenticated;
GRANT ALL ON public.vencimentos_padrao TO service_role;
ALTER TABLE public.vencimentos_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vencimentos_padrao_select" ON public.vencimentos_padrao FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vencimentos_padrao_insert" ON public.vencimentos_padrao FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vencimentos_padrao_update" ON public.vencimentos_padrao FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vencimentos_padrao_delete" ON public.vencimentos_padrao FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_vencimentos_padrao_updated_at BEFORE UPDATE ON public.vencimentos_padrao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vencimentos_padrao_empresa ON public.vencimentos_padrao(empresa_representada_id);
CREATE INDEX idx_vencimentos_padrao_ativo ON public.vencimentos_padrao(ativo);

-- ============================================================
-- 6. descontos_padrao
-- ============================================================
CREATE TABLE public.descontos_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50),
  valor NUMERIC(15,2) DEFAULT 0,
  percentual NUMERIC(8,4) DEFAULT 0,
  referencia VARCHAR(50),
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.descontos_padrao TO authenticated;
GRANT ALL ON public.descontos_padrao TO service_role;
ALTER TABLE public.descontos_padrao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "descontos_padrao_select" ON public.descontos_padrao FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "descontos_padrao_insert" ON public.descontos_padrao FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "descontos_padrao_update" ON public.descontos_padrao FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "descontos_padrao_delete" ON public.descontos_padrao FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_descontos_padrao_updated_at BEFORE UPDATE ON public.descontos_padrao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_descontos_padrao_empresa ON public.descontos_padrao(empresa_representada_id);
CREATE INDEX idx_descontos_padrao_ativo ON public.descontos_padrao(ativo);

-- ============================================================
-- 7. modalidade_caixas
-- ============================================================
CREATE TABLE public.modalidade_caixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(50),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidade_caixas TO authenticated;
GRANT ALL ON public.modalidade_caixas TO service_role;
ALTER TABLE public.modalidade_caixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modalidade_caixas_select" ON public.modalidade_caixas FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_caixas_insert" ON public.modalidade_caixas FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_caixas_update" ON public.modalidade_caixas FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_caixas_delete" ON public.modalidade_caixas FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_modalidade_caixas_updated_at BEFORE UPDATE ON public.modalidade_caixas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_modalidade_caixas_empresa ON public.modalidade_caixas(empresa_representada_id);
CREATE INDEX idx_modalidade_caixas_ativo ON public.modalidade_caixas(ativo);

-- ============================================================
-- 8. natureza_caixas
-- ============================================================
CREATE TABLE public.natureza_caixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) CHECK (tipo IN ('RECEITA','DESPESA','TRANSFERENCIA')),
  codigo VARCHAR(50),
  plano_conta_id UUID REFERENCES public.plano_contas(id),
  centro_custo_id UUID REFERENCES public.centros_custo(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  permite_estorno BOOLEAN NOT NULL DEFAULT true,
  requer_documento BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.natureza_caixas TO authenticated;
GRANT ALL ON public.natureza_caixas TO service_role;
ALTER TABLE public.natureza_caixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "natureza_caixas_select" ON public.natureza_caixas FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natureza_caixas_insert" ON public.natureza_caixas FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natureza_caixas_update" ON public.natureza_caixas FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "natureza_caixas_delete" ON public.natureza_caixas FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_natureza_caixas_updated_at BEFORE UPDATE ON public.natureza_caixas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_natureza_caixas_empresa ON public.natureza_caixas(empresa_representada_id);
CREATE INDEX idx_natureza_caixas_tipo ON public.natureza_caixas(tipo);
CREATE INDEX idx_natureza_caixas_ativo ON public.natureza_caixas(ativo);

-- ============================================================
-- 9. modalidade_api_vinculo
-- ============================================================
CREATE TABLE public.modalidade_api_vinculo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  endpoint VARCHAR(500),
  metodo VARCHAR(10) NOT NULL DEFAULT 'POST',
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modalidade_api_vinculo TO authenticated;
GRANT ALL ON public.modalidade_api_vinculo TO service_role;
ALTER TABLE public.modalidade_api_vinculo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modalidade_api_vinculo_select" ON public.modalidade_api_vinculo FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_api_vinculo_insert" ON public.modalidade_api_vinculo FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_api_vinculo_update" ON public.modalidade_api_vinculo FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "modalidade_api_vinculo_delete" ON public.modalidade_api_vinculo FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_modalidade_api_vinculo_updated_at BEFORE UPDATE ON public.modalidade_api_vinculo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_modalidade_api_vinculo_empresa ON public.modalidade_api_vinculo(empresa_representada_id);
CREATE INDEX idx_modalidade_api_vinculo_ativo ON public.modalidade_api_vinculo(ativo);
