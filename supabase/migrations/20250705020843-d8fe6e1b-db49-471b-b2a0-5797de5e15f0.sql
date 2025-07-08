
-- Adicionar novos campos à tabela produtos para suportar o cadastro completo
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso numeric(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS altura numeric(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS largura numeric(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS comprimento numeric(10,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS variacoes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS margem_lucro numeric(5,2);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS imagem text;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ncm varchar(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cst_csosn varchar(10);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cfop varchar(10);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cest varchar(20);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ficha_tecnica text;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS modo_preparo text;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_delivery varchar(50);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_total numeric(10,2);

-- Criar índice único para código de barras (se não for nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_produtos_codigo_barras_unique 
ON produtos(codigo_barras) WHERE codigo_barras IS NOT NULL AND codigo_barras != '';

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_ncm ON produtos(ncm);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- Atualizar comentários para documentar os novos campos
COMMENT ON COLUMN produtos.peso IS 'Peso do produto em kg';
COMMENT ON COLUMN produtos.altura IS 'Altura do produto em cm';
COMMENT ON COLUMN produtos.largura IS 'Largura do produto em cm';
COMMENT ON COLUMN produtos.comprimento IS 'Comprimento do produto em cm';
COMMENT ON COLUMN produtos.variacoes IS 'Variações do produto (cores, tamanhos, etc.) em formato JSON';
COMMENT ON COLUMN produtos.margem_lucro IS 'Margem de lucro em percentual';
COMMENT ON COLUMN produtos.imagem IS 'URL ou caminho da imagem do produto';
COMMENT ON COLUMN produtos.ncm IS 'Nomenclatura Comum do Mercosul';
COMMENT ON COLUMN produtos.cst_csosn IS 'Código de Situação Tributária';
COMMENT ON COLUMN produtos.cfop IS 'Código Fiscal de Operações e Prestações';
COMMENT ON COLUMN produtos.cest IS 'Código Especificador da Substituição Tributária';
COMMENT ON COLUMN produtos.ficha_tecnica IS 'Informações técnicas do produto';
COMMENT ON COLUMN produtos.modo_preparo IS 'Instruções de preparo ou uso';
COMMENT ON COLUMN produtos.codigo_delivery IS 'Código do produto em plataformas de delivery';
COMMENT ON COLUMN produtos.custo_total IS 'Custo total estimado do produto';
