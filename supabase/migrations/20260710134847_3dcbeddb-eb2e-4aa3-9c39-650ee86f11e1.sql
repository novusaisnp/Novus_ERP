
-- ============================================================
-- 1. clientes
-- ============================================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF','PJ')),
  nome VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  rg VARCHAR(20),
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  email VARCHAR(255),
  email_secundario VARCHAR(255),
  telefone VARCHAR(20),
  telefone_secundario VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  website VARCHAR(255),
  observacoes TEXT,
  limite_credito NUMERIC(15,2) DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_clientes_empresa ON public.clientes(empresa_representada_id);
CREATE INDEX idx_clientes_cnpj ON public.clientes(cnpj);
CREATE INDEX idx_clientes_cpf ON public.clientes(cpf);
CREATE INDEX idx_clientes_ativo ON public.clientes(ativo);
CREATE INDEX idx_clientes_deleted_at ON public.clientes(deleted_at);

-- ============================================================
-- 2. fornecedores
-- ============================================================
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  tipo_pessoa VARCHAR(2) CHECK (tipo_pessoa IN ('PF','PJ')),
  nome VARCHAR(255) NOT NULL,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cpf VARCHAR(14),
  cnpj VARCHAR(18),
  inscricao_estadual VARCHAR(20),
  inscricao_municipal VARCHAR(20),
  email VARCHAR(255),
  email_secundario VARCHAR(255),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  whatsapp VARCHAR(20),
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  banco VARCHAR(100),
  agencia VARCHAR(20),
  conta VARCHAR(30),
  tipo_conta VARCHAR(20),
  pix VARCHAR(100),
  prazo_entrega INTEGER,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fornecedores TO authenticated;
GRANT ALL ON public.fornecedores TO service_role;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fornecedores_select" ON public.fornecedores FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fornecedores_insert" ON public.fornecedores FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fornecedores_update" ON public.fornecedores FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fornecedores_delete" ON public.fornecedores FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_fornecedores_updated_at BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_fornecedores_empresa ON public.fornecedores(empresa_representada_id);
CREATE INDEX idx_fornecedores_cnpj ON public.fornecedores(cnpj);
CREATE INDEX idx_fornecedores_ativo ON public.fornecedores(ativo);

-- ============================================================
-- 3. categorias_produtos
-- ============================================================
CREATE TABLE public.categorias_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_produtos TO authenticated;
GRANT ALL ON public.categorias_produtos TO service_role;
ALTER TABLE public.categorias_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categorias_produtos_select" ON public.categorias_produtos FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categorias_produtos_insert" ON public.categorias_produtos FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categorias_produtos_update" ON public.categorias_produtos FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "categorias_produtos_delete" ON public.categorias_produtos FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_categorias_produtos_updated_at BEFORE UPDATE ON public.categorias_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. unidades_medida
-- ============================================================
CREATE TABLE public.unidades_medida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(100) NOT NULL,
  sigla VARCHAR(10) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unidades_medida TO authenticated;
GRANT ALL ON public.unidades_medida TO service_role;
ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unidades_medida_select" ON public.unidades_medida FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "unidades_medida_insert" ON public.unidades_medida FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "unidades_medida_update" ON public.unidades_medida FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "unidades_medida_delete" ON public.unidades_medida FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_unidades_medida_updated_at BEFORE UPDATE ON public.unidades_medida
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. tamanhos_produtos
-- ============================================================
CREATE TABLE public.tamanhos_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tamanhos_produtos TO authenticated;
GRANT ALL ON public.tamanhos_produtos TO service_role;
ALTER TABLE public.tamanhos_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tamanhos_produtos_select" ON public.tamanhos_produtos FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tamanhos_produtos_insert" ON public.tamanhos_produtos FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tamanhos_produtos_update" ON public.tamanhos_produtos FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tamanhos_produtos_delete" ON public.tamanhos_produtos FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_tamanhos_produtos_updated_at BEFORE UPDATE ON public.tamanhos_produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. produtos
-- ============================================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  codigo VARCHAR(100),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  categoria_id UUID REFERENCES public.categorias_produtos(id),
  unidade_medida_id UUID REFERENCES public.unidades_medida(id),
  preco_custo NUMERIC(15,2) DEFAULT 0,
  preco_venda NUMERIC(15,2) DEFAULT 0,
  margem_lucro NUMERIC(8,2),
  estoque_atual NUMERIC(15,3) DEFAULT 0,
  estoque_minimo NUMERIC(15,3) DEFAULT 0,
  estoque_maximo NUMERIC(15,3),
  controla_estoque BOOLEAN NOT NULL DEFAULT true,
  ncm VARCHAR(20),
  cest VARCHAR(10),
  origem_produto VARCHAR(2),
  peso NUMERIC(10,3),
  altura NUMERIC(10,2),
  largura NUMERIC(10,2),
  comprimento NUMERIC(10,2),
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_select" ON public.produtos FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produtos_insert" ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produtos_update" ON public.produtos FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produtos_delete" ON public.produtos FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_produtos_updated_at BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_produtos_empresa ON public.produtos(empresa_representada_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria_id);
CREATE INDEX idx_produtos_ativo ON public.produtos(ativo);
CREATE INDEX idx_produtos_deleted_at ON public.produtos(deleted_at);

-- ============================================================
-- 7. servicos
-- ============================================================
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  codigo VARCHAR(100),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco NUMERIC(15,2) DEFAULT 0,
  unidade_medida_id UUID REFERENCES public.unidades_medida(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos TO authenticated;
GRANT ALL ON public.servicos TO service_role;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servicos_select" ON public.servicos FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "servicos_insert" ON public.servicos FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "servicos_update" ON public.servicos FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "servicos_delete" ON public.servicos FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_servicos_updated_at BEFORE UPDATE ON public.servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 8. produto_fornecedores
-- ============================================================
CREATE TABLE public.produto_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id),
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
  codigo_fornecedor VARCHAR(100),
  preco_custo NUMERIC(15,2),
  prazo_entrega INTEGER,
  principal BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT produto_fornecedores_unique UNIQUE (produto_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_fornecedores TO authenticated;
GRANT ALL ON public.produto_fornecedores TO service_role;
ALTER TABLE public.produto_fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produto_fornecedores_select" ON public.produto_fornecedores FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produto_fornecedores_insert" ON public.produto_fornecedores FOR INSERT TO authenticated
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produto_fornecedores_update" ON public.produto_fornecedores FOR UPDATE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "produto_fornecedores_delete" ON public.produto_fornecedores FOR DELETE TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_produto_fornecedores_updated_at BEFORE UPDATE ON public.produto_fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_produto_fornecedores_produto ON public.produto_fornecedores(produto_id);
CREATE INDEX idx_produto_fornecedores_fornecedor ON public.produto_fornecedores(fornecedor_id);
