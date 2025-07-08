
-- Criar tabela para relacionar produtos com fornecedores
CREATE TABLE IF NOT EXISTS produto_fornecedores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  fornecedor_id uuid NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
  codigo_fornecedor varchar(100) NOT NULL,
  descricao_fornecedor text,
  unidade_compra varchar(20) NOT NULL DEFAULT 'UN',
  fator_conversao numeric(10,4) NOT NULL DEFAULT 1,
  preco_compra numeric(12,2) NOT NULL,
  preco_ultima_compra numeric(12,2),
  data_ultima_compra timestamp with time zone,
  lead_time_dias integer,
  pedido_minimo numeric(12,2),
  agrupamento varchar(50),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_produto_fornecedores_produto_id ON produto_fornecedores(produto_id);
CREATE INDEX IF NOT EXISTS idx_produto_fornecedores_fornecedor_id ON produto_fornecedores(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_produto_fornecedores_ativo ON produto_fornecedores(ativo);

-- Criar constraint para evitar duplicação de fornecedor por produto com mesmo código
CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fornecedores_unique 
ON produto_fornecedores(produto_id, fornecedor_id, codigo_fornecedor) 
WHERE ativo = true;

-- Habilitar RLS na tabela
ALTER TABLE produto_fornecedores ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - produto_fornecedores" 
ON produto_fornecedores FOR ALL TO authenticated USING (true);

-- Comentários para documentar os campos
COMMENT ON TABLE produto_fornecedores IS 'Relacionamento entre produtos e fornecedores com informações específicas de cada fornecedor';
COMMENT ON COLUMN produto_fornecedores.codigo_fornecedor IS 'Código do produto no catálogo do fornecedor';
COMMENT ON COLUMN produto_fornecedores.descricao_fornecedor IS 'Descrição do produto conforme fornecedor';
COMMENT ON COLUMN produto_fornecedores.unidade_compra IS 'Unidade de medida para compra (UN, CX, KG, etc.)';
COMMENT ON COLUMN produto_fornecedores.fator_conversao IS 'Fator para converter unidade de compra para unidade de venda';
COMMENT ON COLUMN produto_fornecedores.preco_compra IS 'Preço atual de compra';
COMMENT ON COLUMN produto_fornecedores.preco_ultima_compra IS 'Último preço pago na compra';
COMMENT ON COLUMN produto_fornecedores.data_ultima_compra IS 'Data da última compra realizada';
COMMENT ON COLUMN produto_fornecedores.lead_time_dias IS 'Tempo de entrega em dias';
COMMENT ON COLUMN produto_fornecedores.pedido_minimo IS 'Quantidade mínima para pedido';
COMMENT ON COLUMN produto_fornecedores.agrupamento IS 'Tipo de agrupamento (pacote, caixa, fardo, etc.)';
