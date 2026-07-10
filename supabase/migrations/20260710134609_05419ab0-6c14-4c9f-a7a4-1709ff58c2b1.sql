
-- ============================================================
-- Função utilitária de updated_at (idempotente)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. empresa_responsavel
-- ============================================================
CREATE TABLE public.empresa_responsavel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  logo_url TEXT,
  configuracoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_responsavel TO authenticated;
GRANT ALL ON public.empresa_responsavel TO service_role;

ALTER TABLE public.empresa_responsavel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler empresa_responsavel"
  ON public.empresa_responsavel FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem inserir empresa_responsavel"
  ON public.empresa_responsavel FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem atualizar empresa_responsavel"
  ON public.empresa_responsavel FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins podem deletar empresa_responsavel"
  ON public.empresa_responsavel FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_empresa_responsavel_updated_at
  BEFORE UPDATE ON public.empresa_responsavel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. empresas_representadas
-- ============================================================
CREATE TABLE public.empresas_representadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  email VARCHAR(255),
  telefone VARCHAR(20),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  cep VARCHAR(9),
  ativo BOOLEAN NOT NULL DEFAULT true,
  configuracoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas_representadas TO authenticated;
GRANT ALL ON public.empresas_representadas TO service_role;

ALTER TABLE public.empresas_representadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê sua empresa vinculada"
  ON public.empresas_representadas FOR SELECT TO authenticated
  USING (id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins inserem empresas_representadas"
  ON public.empresas_representadas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam empresas_representadas"
  ON public.empresas_representadas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam empresas_representadas"
  ON public.empresas_representadas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_empresas_representadas_updated_at
  BEFORE UPDATE ON public.empresas_representadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_empresas_representadas_cnpj ON public.empresas_representadas(cnpj);
CREATE INDEX idx_empresas_representadas_ativo ON public.empresas_representadas(ativo);

-- ============================================================
-- 3. perfis
-- ============================================================
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  empresa_representada_id UUID REFERENCES public.empresas_representadas(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê seu próprio perfil"
  ON public.perfis FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuário insere seu próprio perfil"
  ON public.perfis FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza seu próprio perfil"
  ON public.perfis FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins deletam perfis"
  ON public.perfis FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_perfis_user_id ON public.perfis(user_id);
CREATE INDEX idx_perfis_empresa_representada_id ON public.perfis(empresa_representada_id);

-- ============================================================
-- 4. usuarios
-- ============================================================
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  empresa_representada_id UUID REFERENCES public.empresas_representadas(id),
  perfil_id UUID REFERENCES public.perfis(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê usuários da mesma empresa"
  ON public.usuarios FOR SELECT TO authenticated
  USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins inserem usuarios"
  ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins atualizam usuarios"
  ON public.usuarios FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins deletam usuarios"
  ON public.usuarios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_usuarios_user_id ON public.usuarios(user_id);
CREATE INDEX idx_usuarios_empresa_representada_id ON public.usuarios(empresa_representada_id);
CREATE INDEX idx_usuarios_ativo ON public.usuarios(ativo);
