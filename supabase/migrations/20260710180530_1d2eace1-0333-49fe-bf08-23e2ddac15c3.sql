
-- 1. departamentos
CREATE TABLE public.departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar(255) NOT NULL,
  descricao text,
  responsavel_id uuid,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departamentos TO authenticated;
GRANT ALL ON public.departamentos TO service_role;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dept_select" ON public.departamentos FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "dept_insert" ON public.departamentos FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "dept_update" ON public.departamentos FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "dept_delete" ON public.departamentos FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_dept_empresa ON public.departamentos(empresa_representada_id);
CREATE INDEX idx_dept_ativo ON public.departamentos(ativo);
CREATE TRIGGER trg_dept_updated BEFORE UPDATE ON public.departamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. setores_empresa
CREATE TABLE public.setores_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  departamento_id uuid REFERENCES public.departamentos(id),
  nome varchar(255) NOT NULL,
  descricao text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setores_empresa TO authenticated;
GRANT ALL ON public.setores_empresa TO service_role;
ALTER TABLE public.setores_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "set_select" ON public.setores_empresa FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "set_insert" ON public.setores_empresa FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "set_update" ON public.setores_empresa FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "set_delete" ON public.setores_empresa FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_set_empresa ON public.setores_empresa(empresa_representada_id);
CREATE INDEX idx_set_dept ON public.setores_empresa(departamento_id);
CREATE INDEX idx_set_ativo ON public.setores_empresa(ativo);
CREATE TRIGGER trg_set_updated BEFORE UPDATE ON public.setores_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. cargos
CREATE TABLE public.cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar(255) NOT NULL,
  descricao text,
  cbo varchar(10),
  nivel varchar(50),
  salario_base numeric(15,2) DEFAULT 0,
  departamento_id uuid REFERENCES public.departamentos(id),
  setor_id uuid REFERENCES public.setores_empresa(id),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cargos TO authenticated;
GRANT ALL ON public.cargos TO service_role;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "car_select" ON public.cargos FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "car_insert" ON public.cargos FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "car_update" ON public.cargos FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "car_delete" ON public.cargos FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_car_empresa ON public.cargos(empresa_representada_id);
CREATE INDEX idx_car_dept ON public.cargos(departamento_id);
CREATE INDEX idx_car_set ON public.cargos(setor_id);
CREATE INDEX idx_car_ativo ON public.cargos(ativo);
CREATE TRIGGER trg_car_updated BEFORE UPDATE ON public.cargos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. colaboradores
CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar(255) NOT NULL,
  cpf varchar(14),
  rg varchar(20),
  data_nascimento date,
  sexo varchar(1) CHECK (sexo IN ('M','F','O')),
  estado_civil varchar(20),
  escolaridade varchar(50),
  email varchar(255),
  email_corporativo varchar(255),
  telefone varchar(20),
  celular varchar(20),
  whatsapp varchar(20),
  cep varchar(9),
  logradouro varchar(255),
  numero varchar(20),
  complemento varchar(100),
  bairro varchar(100),
  cidade varchar(100),
  estado varchar(2),
  cargo_id uuid REFERENCES public.cargos(id),
  departamento_id uuid REFERENCES public.departamentos(id),
  setor_id uuid REFERENCES public.setores_empresa(id),
  data_admissao date,
  data_demissao date,
  tipo_contrato varchar(50),
  regime_trabalho varchar(50),
  carga_horaria numeric(5,2),
  salario numeric(15,2) DEFAULT 0,
  banco varchar(100),
  agencia varchar(20),
  conta varchar(30),
  tipo_conta varchar(20),
  pix varchar(100),
  pis varchar(20),
  ctps varchar(30),
  serie_ctps varchar(15),
  foto_url text,
  observacoes text,
  ativo boolean DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.colaboradores TO authenticated;
GRANT ALL ON public.colaboradores TO service_role;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "col_select" ON public.colaboradores FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "col_insert" ON public.colaboradores FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "col_update" ON public.colaboradores FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "col_delete" ON public.colaboradores FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_col_empresa ON public.colaboradores(empresa_representada_id);
CREATE INDEX idx_col_cargo ON public.colaboradores(cargo_id);
CREATE INDEX idx_col_dept ON public.colaboradores(departamento_id);
CREATE INDEX idx_col_set ON public.colaboradores(setor_id);
CREATE INDEX idx_col_cpf ON public.colaboradores(cpf);
CREATE INDEX idx_col_ativo ON public.colaboradores(ativo);
CREATE INDEX idx_col_deleted ON public.colaboradores(deleted_at);
CREATE TRIGGER trg_col_updated BEFORE UPDATE ON public.colaboradores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FK responsavel_id -> colaboradores
ALTER TABLE public.departamentos ADD CONSTRAINT fk_departamentos_responsavel FOREIGN KEY (responsavel_id) REFERENCES public.colaboradores(id) ON DELETE SET NULL;

-- 5. folha_pagamento
CREATE TABLE public.folha_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  competencia varchar(7) NOT NULL,
  salario_base numeric(15,2) NOT NULL,
  total_vencimentos numeric(15,2) DEFAULT 0,
  total_descontos numeric(15,2) DEFAULT 0,
  salario_liquido numeric(15,2) DEFAULT 0,
  inss numeric(15,2) DEFAULT 0,
  irrf numeric(15,2) DEFAULT 0,
  fgts numeric(15,2) DEFAULT 0,
  data_pagamento date,
  status varchar(20) CHECK (status IN ('RASCUNHO','CALCULADO','APROVADO','PAGO','CANCELADO')) DEFAULT 'RASCUNHO',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (colaborador_id, competencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.folha_pagamento TO authenticated;
GRANT ALL ON public.folha_pagamento TO service_role;
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fp_select" ON public.folha_pagamento FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "fp_insert" ON public.folha_pagamento FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "fp_update" ON public.folha_pagamento FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "fp_delete" ON public.folha_pagamento FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_fp_empresa ON public.folha_pagamento(empresa_representada_id);
CREATE INDEX idx_fp_col ON public.folha_pagamento(colaborador_id);
CREATE INDEX idx_fp_comp ON public.folha_pagamento(competencia);
CREATE INDEX idx_fp_status ON public.folha_pagamento(status);
CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.folha_pagamento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. beneficios_vinculados
CREATE TABLE public.beneficios_vinculados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome varchar(255) NOT NULL,
  tipo varchar(50),
  valor numeric(15,2) DEFAULT 0,
  percentual numeric(8,4) DEFAULT 0,
  desconta_folha boolean DEFAULT false,
  empresa_paga boolean DEFAULT false,
  inicio_vigencia date,
  fim_vigencia date,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beneficios_vinculados TO authenticated;
GRANT ALL ON public.beneficios_vinculados TO service_role;
ALTER TABLE public.beneficios_vinculados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bv_select" ON public.beneficios_vinculados FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "bv_insert" ON public.beneficios_vinculados FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "bv_update" ON public.beneficios_vinculados FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "bv_delete" ON public.beneficios_vinculados FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_bv_empresa ON public.beneficios_vinculados(empresa_representada_id);
CREATE INDEX idx_bv_col ON public.beneficios_vinculados(colaborador_id);
CREATE INDEX idx_bv_ativo ON public.beneficios_vinculados(ativo);
CREATE TRIGGER trg_bv_updated BEFORE UPDATE ON public.beneficios_vinculados FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. registros_ponto
CREATE TABLE public.registros_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id),
  data_registro date NOT NULL,
  entrada_1 time, saida_1 time,
  entrada_2 time, saida_2 time,
  entrada_3 time, saida_3 time,
  total_horas numeric(5,2),
  horas_extras numeric(5,2) DEFAULT 0,
  horas_falta numeric(5,2) DEFAULT 0,
  justificativa text,
  status varchar(20) CHECK (status IN ('PENDENTE','APROVADO','REJEITADO')) DEFAULT 'PENDENTE',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registros_ponto TO authenticated;
GRANT ALL ON public.registros_ponto TO service_role;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_select" ON public.registros_ponto FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "rp_insert" ON public.registros_ponto FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "rp_update" ON public.registros_ponto FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "rp_delete" ON public.registros_ponto FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_rp_empresa ON public.registros_ponto(empresa_representada_id);
CREATE INDEX idx_rp_col ON public.registros_ponto(colaborador_id);
CREATE INDEX idx_rp_data ON public.registros_ponto(data_registro);
CREATE INDEX idx_rp_status ON public.registros_ponto(status);
CREATE TRIGGER trg_rp_updated BEFORE UPDATE ON public.registros_ponto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. integracoes_ponto
CREATE TABLE public.integracoes_ponto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar(255) NOT NULL,
  tipo varchar(50),
  endpoint varchar(500),
  token_autenticacao text,
  configuracoes jsonb DEFAULT '{}',
  ultima_sincronizacao timestamptz,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integracoes_ponto TO authenticated;
GRANT ALL ON public.integracoes_ponto TO service_role;
ALTER TABLE public.integracoes_ponto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip_select" ON public.integracoes_ponto FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ip_insert" ON public.integracoes_ponto FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ip_update" ON public.integracoes_ponto FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "ip_delete" ON public.integracoes_ponto FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_ip_empresa ON public.integracoes_ponto(empresa_representada_id);
CREATE INDEX idx_ip_ativo ON public.integracoes_ponto(ativo);
CREATE TRIGGER trg_ip_updated BEFORE UPDATE ON public.integracoes_ponto FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
