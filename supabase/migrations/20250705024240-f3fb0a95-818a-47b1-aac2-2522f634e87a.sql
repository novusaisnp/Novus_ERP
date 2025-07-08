
-- Criar tabela de configurações fiscais por empresa
CREATE TABLE IF NOT EXISTS configuracoes_fiscais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES empresas_representadas(id) ON DELETE CASCADE,
  ambiente varchar(10) NOT NULL DEFAULT 'Teste', -- 'Producao' ou 'Teste'
  certificado_digital text,
  senha_certificado text,
  regime_tributario varchar(50) NOT NULL DEFAULT 'Simples Nacional',
  aliquota_icms_padrao numeric(5,2) DEFAULT 18.00,
  aliquota_ipi_padrao numeric(5,2) DEFAULT 0.00,
  aliquota_pis_padrao numeric(5,2) DEFAULT 1.65,
  aliquota_cofins_padrao numeric(5,2) DEFAULT 7.60,
  aliquota_iss_padrao numeric(5,2) DEFAULT 5.00,
  serie_nfe varchar(3) DEFAULT '1',
  numero_ultimo_nfe integer DEFAULT 0,
  serie_nfce varchar(3) DEFAULT '1',
  numero_ultimo_nfce integer DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_representada_id)
);

-- Criar tabela de natureza de operação
CREATE TABLE IF NOT EXISTS natureza_operacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(10) NOT NULL UNIQUE,
  descricao varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL, -- 'venda', 'compra', 'remessa', 'devolucao', 'transferencia'
  finalidade varchar(50) NOT NULL, -- 'normal', 'complementar', 'ajuste', 'devolucao'
  cfop_dentro_estado varchar(4),
  cfop_fora_estado varchar(4),
  cfop_exterior varchar(4),
  gera_duplicata boolean DEFAULT true,
  movimenta_estoque boolean DEFAULT true,
  calcula_icms boolean DEFAULT true,
  calcula_ipi boolean DEFAULT false,
  calcula_pis_cofins boolean DEFAULT true,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de CFOP
CREATE TABLE IF NOT EXISTS cfop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(4) NOT NULL UNIQUE,
  descricao text NOT NULL,
  aplicacao text,
  destino varchar(20) NOT NULL, -- 'interno', 'interestadual', 'exterior'
  tipo varchar(20) NOT NULL, -- 'entrada', 'saida'
  categoria varchar(50), -- 'venda', 'compra', 'transferencia', 'devolucao', 'remessa'
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de tributos e alíquotas
CREATE TABLE IF NOT EXISTS tributos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao varchar(255) NOT NULL,
  tipo varchar(20) NOT NULL, -- 'ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', 'CSLL', 'IRPJ'
  subtipo varchar(50), -- 'normal', 'substituicao', 'diferido', 'isento'
  aliquota numeric(8,4) NOT NULL,
  base_calculo numeric(8,4) DEFAULT 100.00,
  uf varchar(2), -- null para tributos federais/nacionais
  regime_tributario varchar(50), -- aplicação específica por regime
  ncm_inicio varchar(8), -- faixa de NCM de aplicação
  ncm_fim varchar(8),
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de NCM (Nomenclatura Comum do Mercosul)
CREATE TABLE IF NOT EXISTS ncm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(8) NOT NULL UNIQUE,
  descricao text NOT NULL,
  unidade varchar(10),
  aliquota_ipi numeric(5,2) DEFAULT 0.00,
  categoria varchar(100),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_fiscais_empresa ON configuracoes_fiscais(empresa_representada_id);
CREATE INDEX IF NOT EXISTS idx_natureza_operacao_tipo ON natureza_operacao(tipo);
CREATE INDEX IF NOT EXISTS idx_cfop_codigo ON cfop(codigo);
CREATE INDEX IF NOT EXISTS idx_cfop_destino ON cfop(destino, tipo);
CREATE INDEX IF NOT EXISTS idx_tributos_tipo ON tributos(tipo, uf);
CREATE INDEX IF NOT EXISTS idx_tributos_ncm ON tributos(ncm_inicio, ncm_fim);
CREATE INDEX IF NOT EXISTS idx_ncm_codigo ON ncm(codigo);

-- Habilitar RLS nas tabelas
ALTER TABLE configuracoes_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE natureza_operacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfop ENABLE ROW LEVEL SECURITY;
ALTER TABLE tributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncm ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - configuracoes_fiscais" 
ON configuracoes_fiscais FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - natureza_operacao" 
ON natureza_operacao FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - cfop" 
ON cfop FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - tributos" 
ON tributos FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - ncm" 
ON ncm FOR ALL TO authenticated USING (true);

-- Inserir dados iniciais de CFOP mais comuns
INSERT INTO cfop (codigo, descricao, aplicacao, destino, tipo, categoria) VALUES
('5101', 'Venda de produção do estabelecimento', 'Venda de produtos industrializados ou produzidos pelo próprio estabelecimento', 'interno', 'saida', 'venda'),
('5102', 'Venda de mercadoria adquirida ou recebida de terceiros', 'Venda de mercadorias adquiridas ou recebidas de terceiros para revenda', 'interno', 'saida', 'venda'),
('5103', 'Venda de produção do estabelecimento, efetuada fora do estabelecimento', 'Venda de produtos fora do estabelecimento', 'interno', 'saida', 'venda'),
('5104', 'Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento', 'Venda de mercadorias de terceiros fora do estabelecimento', 'interno', 'saida', 'venda'),
('5109', 'Venda de produção do estabelecimento, não tributada pelo ICMS', 'Venda não tributada pelo ICMS', 'interno', 'saida', 'venda'),
('5110', 'Venda de mercadoria adquirida ou recebida de terceiros, não tributada pelo ICMS', 'Venda de mercadorias não tributadas pelo ICMS', 'interno', 'saida', 'venda'),
('5201', 'Devolução de compra para industrialização', 'Devolução de mercadorias destinadas à industrialização', 'interno', 'saida', 'devolucao'),
('5202', 'Devolução de compra para comercialização', 'Devolução de mercadorias destinadas à comercialização', 'interno', 'saida', 'devolucao'),
('5411', 'Remessa de produção do estabelecimento para venda fora do estabelecimento', 'Remessa para venda em outro local', 'interno', 'saida', 'remessa'),
('5412', 'Remessa de mercadoria adquirida ou recebida de terceiros para venda fora do estabelecimento', 'Remessa de mercadorias de terceiros para venda', 'interno', 'saida', 'remessa'),
('6101', 'Venda de produção do estabelecimento', 'Venda de produtos para outros estados', 'interestadual', 'saida', 'venda'),
('6102', 'Venda de mercadoria adquirida ou recebida de terceiros', 'Venda de mercadorias para outros estados', 'interestadual', 'saida', 'venda'),
('6103', 'Venda de produção do estabelecimento, efetuada fora do estabelecimento', 'Venda de produtos fora do estabelecimento para outros estados', 'interestadual', 'saida', 'venda'),
('6104', 'Venda de mercadoria adquirida ou recebida de terceiros, efetuada fora do estabelecimento', 'Venda de mercadorias de terceiros para outros estados', 'interestadual', 'saida', 'venda'),
('6109', 'Venda de produção do estabelecimento, não tributada pelo ICMS', 'Venda não tributada para outros estados', 'interestadual', 'saida', 'venda'),
('6110', 'Venda de mercadoria adquirida ou recebida de terceiros, não tributada pelo ICMS', 'Venda não tributada de mercadorias para outros estados', 'interestadual', 'saida', 'venda'),
('1101', 'Compra para industrialização', 'Compra de mercadorias para processo industrial', 'interno', 'entrada', 'compra'),
('1102', 'Compra para comercialização', 'Compra de mercadorias para revenda', 'interno', 'entrada', 'compra'),
('1113', 'Compra para industrialização, não tributada pelo ICMS', 'Compra não tributada para industrialização', 'interno', 'entrada', 'compra'),
('1117', 'Compra para comercialização, não tributada pelo ICMS', 'Compra não tributada para comercialização', 'interno', 'entrada', 'compra'),
('2101', 'Compra para industrialização', 'Compra de outros estados para industrialização', 'interestadual', 'entrada', 'compra'),
('2102', 'Compra para comercialização', 'Compra de outros estados para comercialização', 'interestadual', 'entrada', 'compra')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir naturezas de operação básicas
INSERT INTO natureza_operacao (codigo, descricao, tipo, finalidade, cfop_dentro_estado, cfop_fora_estado, gera_duplicata, movimenta_estoque, calcula_icms, calcula_ipi, calcula_pis_cofins) VALUES
('VENDA', 'Venda de Mercadorias', 'venda', 'normal', '5102', '6102', true, true, true, false, true),
('VENDA-PROD', 'Venda de Produção Própria', 'venda', 'normal', '5101', '6101', true, true, true, false, true),
('COMPRA', 'Compra para Revenda', 'compra', 'normal', '1102', '2102', false, true, true, false, true),
('COMPRA-IND', 'Compra para Industrialização', 'compra', 'normal', '1101', '2101', false, true, true, true, true),
('DEVOLUCAO-V', 'Devolução de Venda', 'devolucao', 'devolucao', '5202', '6202', false, true, true, false, false),
('DEVOLUCAO-C', 'Devolução de Compra', 'devolucao', 'devolucao', '1202', '2202', false, true, true, false, false),
('REMESSA', 'Remessa para Venda Fora', 'remessa', 'normal', '5412', '6412', false, true, false, false, false),
('RETORNO', 'Retorno de Remessa', 'transferencia', 'normal', '1412', '2412', false, true, false, false, false)
ON CONFLICT (codigo) DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE configuracoes_fiscais IS 'Configurações fiscais específicas por empresa representada';
COMMENT ON TABLE natureza_operacao IS 'Cadastro de naturezas de operação fiscal';
COMMENT ON TABLE cfop IS 'Códigos Fiscais de Operações e Prestações';
COMMENT ON TABLE tributos IS 'Alíquotas e configurações tributárias por região/produto';
COMMENT ON TABLE ncm IS 'Nomenclatura Comum do Mercosul para classificação de produtos';
