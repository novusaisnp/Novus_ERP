
-- 1. contas_pagar
CREATE TABLE public.contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  fornecedor_id uuid REFERENCES public.fornecedores(id),
  numero_documento varchar(100),
  descricao text NOT NULL,
  valor_original numeric(15,2) NOT NULL,
  valor_pago numeric(15,2) DEFAULT 0,
  valor_desconto numeric(15,2) DEFAULT 0,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  data_emissao date,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status varchar(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PAGO','PARCIAL','VENCIDO','CANCELADO')),
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  natureza_id uuid REFERENCES public.natureza_caixas(id),
  plano_pagamento_id uuid REFERENCES public.planos_pagamento(id),
  numero_parcela integer DEFAULT 1,
  total_parcelas integer DEFAULT 1,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_pagar TO authenticated;
GRANT ALL ON public.contas_pagar TO service_role;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select" ON public.contas_pagar FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cp_insert" ON public.contas_pagar FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cp_update" ON public.contas_pagar FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cp_delete" ON public.contas_pagar FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_cp_empresa ON public.contas_pagar(empresa_representada_id);
CREATE INDEX idx_cp_fornecedor ON public.contas_pagar(fornecedor_id);
CREATE INDEX idx_cp_status ON public.contas_pagar(status);
CREATE INDEX idx_cp_venc ON public.contas_pagar(data_vencimento);
CREATE INDEX idx_cp_pag ON public.contas_pagar(data_pagamento);
CREATE INDEX idx_cp_del ON public.contas_pagar(deleted_at);
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. contas_receber
CREATE TABLE public.contas_receber (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  numero_documento varchar(100),
  descricao text NOT NULL,
  valor_original numeric(15,2) NOT NULL,
  valor_recebido numeric(15,2) DEFAULT 0,
  valor_desconto numeric(15,2) DEFAULT 0,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  data_emissao date,
  data_vencimento date NOT NULL,
  data_recebimento date,
  status varchar(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','RECEBIDO','PARCIAL','VENCIDO','CANCELADO')),
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  natureza_id uuid REFERENCES public.natureza_caixas(id),
  plano_pagamento_id uuid REFERENCES public.planos_pagamento(id),
  numero_parcela integer DEFAULT 1,
  total_parcelas integer DEFAULT 1,
  observacoes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_receber TO authenticated;
GRANT ALL ON public.contas_receber TO service_role;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_select" ON public.contas_receber FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cr_insert" ON public.contas_receber FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cr_update" ON public.contas_receber FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "cr_delete" ON public.contas_receber FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_cr_empresa ON public.contas_receber(empresa_representada_id);
CREATE INDEX idx_cr_cliente ON public.contas_receber(cliente_id);
CREATE INDEX idx_cr_status ON public.contas_receber(status);
CREATE INDEX idx_cr_venc ON public.contas_receber(data_vencimento);
CREATE INDEX idx_cr_rec ON public.contas_receber(data_recebimento);
CREATE INDEX idx_cr_del ON public.contas_receber(deleted_at);
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.contas_receber FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. rateios_contas_pagar
CREATE TABLE public.rateios_contas_pagar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  conta_pagar_id uuid NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  percentual numeric(8,4),
  valor numeric(15,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rateios_contas_pagar TO authenticated;
GRANT ALL ON public.rateios_contas_pagar TO service_role;
ALTER TABLE public.rateios_contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rcp_select" ON public.rateios_contas_pagar FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rcp_insert" ON public.rateios_contas_pagar FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rcp_update" ON public.rateios_contas_pagar FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rcp_delete" ON public.rateios_contas_pagar FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_rcp_empresa ON public.rateios_contas_pagar(empresa_representada_id);
CREATE INDEX idx_rcp_cp ON public.rateios_contas_pagar(conta_pagar_id);
CREATE TRIGGER trg_rcp_updated BEFORE UPDATE ON public.rateios_contas_pagar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. liquidacoes_titulos
CREATE TABLE public.liquidacoes_titulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  conta_pagar_id uuid REFERENCES public.contas_pagar(id),
  conta_receber_id uuid REFERENCES public.contas_receber(id),
  data_liquidacao date NOT NULL,
  valor_pago numeric(15,2) NOT NULL,
  valor_desconto numeric(15,2) DEFAULT 0,
  valor_juros numeric(15,2) DEFAULT 0,
  valor_multa numeric(15,2) DEFAULT 0,
  forma_pagamento varchar(50),
  conta_bancaria_id uuid,
  numero_cheque varchar(50),
  historico text,
  natureza_id uuid REFERENCES public.natureza_caixas(id),
  plano_conta_id uuid REFERENCES public.plano_contas(id),
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  cancelada boolean DEFAULT false,
  motivo_cancelamento text,
  cancelada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidacoes_titulos TO authenticated;
GRANT ALL ON public.liquidacoes_titulos TO service_role;
ALTER TABLE public.liquidacoes_titulos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_select" ON public.liquidacoes_titulos FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lt_insert" ON public.liquidacoes_titulos FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lt_update" ON public.liquidacoes_titulos FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lt_delete" ON public.liquidacoes_titulos FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_lt_empresa ON public.liquidacoes_titulos(empresa_representada_id);
CREATE INDEX idx_lt_cp ON public.liquidacoes_titulos(conta_pagar_id);
CREATE INDEX idx_lt_cr ON public.liquidacoes_titulos(conta_receber_id);
CREATE INDEX idx_lt_data ON public.liquidacoes_titulos(data_liquidacao);
CREATE INDEX idx_lt_canc ON public.liquidacoes_titulos(cancelada);
CREATE TRIGGER trg_lt_updated BEFORE UPDATE ON public.liquidacoes_titulos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. liquidacoes_multiplas
CREATE TABLE public.liquidacoes_multiplas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  data_liquidacao date NOT NULL,
  forma_pagamento varchar(50),
  valor_total numeric(15,2) NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.liquidacoes_multiplas TO authenticated;
GRANT ALL ON public.liquidacoes_multiplas TO service_role;
ALTER TABLE public.liquidacoes_multiplas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lm_select" ON public.liquidacoes_multiplas FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_insert" ON public.liquidacoes_multiplas FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_update" ON public.liquidacoes_multiplas FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "lm_delete" ON public.liquidacoes_multiplas FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_lm_empresa ON public.liquidacoes_multiplas(empresa_representada_id);
CREATE INDEX idx_lm_data ON public.liquidacoes_multiplas(data_liquidacao);

-- 6. documentos_titulos_financeiros
CREATE TABLE public.documentos_titulos_financeiros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  conta_pagar_id uuid REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  conta_receber_id uuid REFERENCES public.contas_receber(id) ON DELETE CASCADE,
  nome_arquivo varchar(255) NOT NULL,
  url_arquivo text NOT NULL,
  tipo_arquivo varchar(50),
  tamanho_bytes bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_titulos_financeiros TO authenticated;
GRANT ALL ON public.documentos_titulos_financeiros TO service_role;
ALTER TABLE public.documentos_titulos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dtf_select" ON public.documentos_titulos_financeiros FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dtf_insert" ON public.documentos_titulos_financeiros FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dtf_update" ON public.documentos_titulos_financeiros FOR UPDATE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin')) WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "dtf_delete" ON public.documentos_titulos_financeiros FOR DELETE TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_dtf_empresa ON public.documentos_titulos_financeiros(empresa_representada_id);
CREATE INDEX idx_dtf_cp ON public.documentos_titulos_financeiros(conta_pagar_id);
CREATE INDEX idx_dtf_cr ON public.documentos_titulos_financeiros(conta_receber_id);

-- 7. historico_movimentacoes_financeiras
CREATE TABLE public.historico_movimentacoes_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  tabela_origem varchar(100) NOT NULL,
  registro_id uuid NOT NULL,
  acao varchar(50) NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid REFERENCES auth.users(id),
  ip_origem inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.historico_movimentacoes_financeiras TO authenticated;
GRANT ALL ON public.historico_movimentacoes_financeiras TO service_role;
ALTER TABLE public.historico_movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hmf_select" ON public.historico_movimentacoes_financeiras FOR SELECT TO authenticated USING (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "hmf_insert" ON public.historico_movimentacoes_financeiras FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = public.get_user_empresa_id() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_hmf_empresa ON public.historico_movimentacoes_financeiras(empresa_representada_id);
CREATE INDEX idx_hmf_tabela ON public.historico_movimentacoes_financeiras(tabela_origem);
CREATE INDEX idx_hmf_reg ON public.historico_movimentacoes_financeiras(registro_id);
CREATE INDEX idx_hmf_user ON public.historico_movimentacoes_financeiras(usuario_id);
CREATE INDEX idx_hmf_created ON public.historico_movimentacoes_financeiras(created_at);
