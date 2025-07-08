
-- Verificar e ajustar tabelas RH existentes, criar novas para Folha de Pagamento

-- Ajustar tabela cargos (adicionar campo ativo se não existir)
ALTER TABLE cargos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Ajustar tabela departamentos (adicionar campo ativo se não existir)
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Criar tabela folha_pagamento
CREATE TABLE IF NOT EXISTS folha_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES colaboradores(id) NOT NULL,
  competencia date NOT NULL,
  salario_base numeric(10,2) DEFAULT 0,
  horas_extras numeric(10,2) DEFAULT 0,
  adicionais numeric(10,2) DEFAULT 0,
  beneficios numeric(10,2) DEFAULT 0,
  descontos numeric(10,2) DEFAULT 0,
  encargos numeric(10,2) DEFAULT 0,
  total_bruto numeric(10,2) DEFAULT 0,
  total_liquido numeric(10,2) DEFAULT 0,
  status varchar(50) DEFAULT 'Pendente',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(colaborador_id, competencia)
);

-- Criar tabela vencimentos_padrao
CREATE TABLE IF NOT EXISTS vencimentos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(10) UNIQUE NOT NULL,
  descricao varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL, -- 'FIXO', 'PERCENTUAL', 'HORAS'
  valor numeric(10,2) DEFAULT 0,
  percentual numeric(5,2) DEFAULT 0,
  incide_inss boolean DEFAULT true,
  incide_irrf boolean DEFAULT true,
  incide_fgts boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela descontos_padrao
CREATE TABLE IF NOT EXISTS descontos_padrao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(10) UNIQUE NOT NULL,
  descricao varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL, -- 'FIXO', 'PERCENTUAL', 'TABELA'
  valor numeric(10,2) DEFAULT 0,
  percentual numeric(5,2) DEFAULT 0,
  tabela_progressiva jsonb, -- Para IRRF, INSS
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela beneficios_vinculados
CREATE TABLE IF NOT EXISTS beneficios_vinculados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES colaboradores(id) NOT NULL,
  codigo varchar(10) NOT NULL,
  descricao varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL, -- 'VT', 'VR', 'PLANO_SAUDE', 'OUTROS'
  valor numeric(10,2) NOT NULL,
  desconto_folha boolean DEFAULT true,
  percentual_desconto numeric(5,2) DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela integracoes_ponto
CREATE TABLE IF NOT EXISTS integracoes_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  tipo varchar(50) NOT NULL, -- 'API', 'UPLOAD'
  configuracao jsonb NOT NULL DEFAULT '{}',
  url_api varchar(500),
  token_api text,
  formato_arquivo varchar(20), -- 'CSV', 'XLSX'
  mapeamento_campos jsonb DEFAULT '{}',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela registros_ponto
CREATE TABLE IF NOT EXISTS registros_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid REFERENCES colaboradores(id) NOT NULL,
  data_ponto date NOT NULL,
  entrada_manha time,
  saida_almoco time,
  volta_almoco time,
  saida_tarde time,
  horas_trabalhadas numeric(4,2) DEFAULT 0,
  horas_extras numeric(4,2) DEFAULT 0,
  observacoes text,
  origem varchar(50) DEFAULT 'MANUAL', -- 'MANUAL', 'API', 'UPLOAD'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(colaborador_id, data_ponto)
);

-- Inserir dados padrão para descontos (INSS, IRRF)
INSERT INTO descontos_padrao (codigo, descricao, tipo, tabela_progressiva) VALUES 
('INSS', 'INSS - Instituto Nacional do Seguro Social', 'TABELA', 
'[
  {"faixa_de": 0, "faixa_ate": 1302.00, "aliquota": 7.5},
  {"faixa_de": 1302.01, "faixa_ate": 2571.29, "aliquota": 9.0},
  {"faixa_de": 2571.30, "faixa_ate": 3856.94, "aliquota": 12.0},
  {"faixa_de": 3856.95, "faixa_ate": 7507.49, "aliquota": 14.0}
]'::jsonb),
('IRRF', 'Imposto de Renda Retido na Fonte', 'TABELA',
'[
  {"faixa_de": 0, "faixa_ate": 2112.00, "aliquota": 0, "deducao": 0},
  {"faixa_de": 2112.01, "faixa_ate": 2826.65, "aliquota": 7.5, "deducao": 158.40},
  {"faixa_de": 2826.66, "faixa_ate": 3751.05, "aliquota": 15.0, "deducao": 370.40},
  {"faixa_de": 3751.06, "faixa_ate": 4664.68, "aliquota": 22.5, "deducao": 651.73},
  {"faixa_de": 4664.69, "faixa_ate": 99999999, "aliquota": 27.5, "deducao": 884.96}
]'::jsonb)
ON CONFLICT (codigo) DO NOTHING;

-- Inserir dados padrão para vencimentos
INSERT INTO vencimentos_padrao (codigo, descricao, tipo, percentual) VALUES 
('HE50', 'Hora Extra 50%', 'HORAS', 50.0),
('HE100', 'Hora Extra 100%', 'HORAS', 100.0),
('ADN', 'Adicional Noturno', 'PERCENTUAL', 20.0),
('ADINS', 'Adicional de Insalubridade', 'PERCENTUAL', 10.0)
ON CONFLICT (codigo) DO NOTHING;

-- Habilitar RLS nas novas tabelas
ALTER TABLE folha_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE vencimentos_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE descontos_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_vinculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para acesso total autenticado
CREATE POLICY "Permitir acesso total para usuários autenticados - folha_pagamento" 
ON folha_pagamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - vencimentos_padrao" 
ON vencimentos_padrao FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - descontos_padrao" 
ON descontos_padrao FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - beneficios_vinculados" 
ON beneficios_vinculados FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - integracoes_ponto" 
ON integracoes_ponto FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - registros_ponto" 
ON registros_ponto FOR ALL TO authenticated USING (true) WITH CHECK (true);
