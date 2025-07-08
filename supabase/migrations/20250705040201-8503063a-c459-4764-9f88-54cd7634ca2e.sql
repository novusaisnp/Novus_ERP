
-- Criar tabela de categorias de produtos
CREATE TABLE IF NOT EXISTS categorias_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL UNIQUE,
  descricao text,
  regras_tributacao jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de localizações de estoque
CREATE TABLE IF NOT EXISTS localizacoes_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de unidades de medida
CREATE TABLE IF NOT EXISTS unidades_medida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  sigla varchar(10) NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de tamanhos de produtos
CREATE TABLE IF NOT EXISTS tamanhos_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao varchar(100) NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE categorias_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE localizacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE tamanhos_produtos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para categorias_produtos
CREATE POLICY "Permitir acesso total para usuários autenticados - categorias_produtos" 
ON categorias_produtos FOR ALL TO authenticated USING (true);

-- Criar políticas RLS para localizacoes_estoque
CREATE POLICY "Permitir acesso total para usuários autenticados - localizacoes_estoque" 
ON localizacoes_estoque FOR ALL TO authenticated USING (true);

-- Criar políticas RLS para unidades_medida
CREATE POLICY "Permitir acesso total para usuários autenticados - unidades_medida" 
ON unidades_medida FOR ALL TO authenticated USING (true);

-- Criar políticas RLS para tamanhos_produtos
CREATE POLICY "Permitir acesso total para usuários autenticados - tamanhos_produtos" 
ON tamanhos_produtos FOR ALL TO authenticated USING (true);

-- Inserir localização padrão "Geral"
INSERT INTO localizacoes_estoque (nome, descricao) 
VALUES ('Geral', 'Localização padrão do sistema')
ON CONFLICT (nome) DO NOTHING;

-- Inserir algumas unidades de medida padrão
INSERT INTO unidades_medida (nome, sigla) VALUES 
('Unidade', 'UN'),
('Quilograma', 'KG'),
('Litro', 'L'),
('Metro', 'M'),
('Centímetro', 'CM'),
('Grama', 'G'),
('Mililitro', 'ML')
ON CONFLICT (sigla) DO NOTHING;

-- Inserir alguns tamanhos padrão
INSERT INTO tamanhos_produtos (descricao) VALUES 
('Normal'),
('Pequeno'),
('Médio'),
('Grande')
ON CONFLICT (descricao) DO NOTHING;
