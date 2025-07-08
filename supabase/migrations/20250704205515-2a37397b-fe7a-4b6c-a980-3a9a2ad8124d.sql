
-- Tabela para Empresa Responsável (empresa principal que opera o sistema)
CREATE TABLE public.empresa_responsavel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255) NOT NULL,
  endereco JSONB NOT NULL,
  nome_responsavel VARCHAR(255) NOT NULL,
  contatos JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para Empresas Representadas (empresas que a responsável representa)
CREATE TABLE public.empresas_representadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_responsavel_id UUID REFERENCES public.empresa_responsavel(id) ON DELETE CASCADE,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255) NOT NULL,
  endereco JSONB NOT NULL,
  qualificacao_fiscal JSONB NOT NULL,
  logomarca JSONB,
  configuracao_nf JSONB NOT NULL,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para Usuários do sistema
CREATE TABLE public.usuarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_representada_id UUID REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  nome_completo VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  perfil_id VARCHAR(50) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  ultimo_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para Perfis de Usuário (perfis customizados além dos do sistema)
CREATE TABLE public.perfis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT,
  permissoes JSONB NOT NULL,
  ativo BOOLEAN DEFAULT true,
  sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.empresa_responsavel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas_representadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso total para usuários autenticados por enquanto)
CREATE POLICY "Permitir acesso total para usuários autenticados - empresa_responsavel" ON public.empresa_responsavel
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - empresas_representadas" ON public.empresas_representadas
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - usuarios" ON public.usuarios
  FOR ALL USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - perfis" ON public.perfis
  FOR ALL USING (true);

-- Inserir perfis padrão do sistema
INSERT INTO public.perfis (nome, codigo, descricao, permissoes, ativo, sistema) VALUES
('ADMINISTRADOR', 'ADMIN', 'Acesso total ao sistema', '["*"]', true, true),
('GERENTE', 'GERENTE', 'Gerenciamento geral', '["vendas.*", "compras.*", "estoque.*"]', true, true),
('FINANCEIRO', 'FINANCEIRO', 'Módulo financeiro', '["financeiro.*"]', true, true),
('CAIXA', 'CAIXA', 'Operações de caixa', '["vendas.create", "caixa.*"]', true, true),
('ESTOQUE', 'ESTOQUE', 'Controle de estoque', '["estoque.*", "produtos.*"]', true, true),
('FISCAL', 'FISCAL', 'Emissão de notas fiscais', '["fiscal.*", "nfe.*"]', true, true),
('VENDEDOR', 'VENDEDOR', 'Vendas e clientes', '["clientes.*", "vendas.create"]', true, true),
('CONSULTOR', 'CONSULTOR', 'Apenas consulta', '["*.read"]', true, true);
