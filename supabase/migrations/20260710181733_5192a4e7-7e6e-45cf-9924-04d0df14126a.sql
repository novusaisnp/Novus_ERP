
-- ============ VENDAS ============
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  numero_venda varchar(50),
  data_venda date NOT NULL DEFAULT current_date,
  data_entrega_prevista date,
  status varchar(30) DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CONFIRMADO','EM_PRODUCAO','FATURADO','ENTREGUE','CANCELADO')),
  origem varchar(50),
  canal_venda varchar(50),
  subtotal numeric(15,2) DEFAULT 0,
  desconto numeric(15,2) DEFAULT 0,
  acrescimo numeric(15,2) DEFAULT 0,
  valor_frete numeric(15,2) DEFAULT 0,
  valor_total numeric(15,2) DEFAULT 0,
  plano_pagamento_id uuid REFERENCES public.planos_pagamento(id),
  observacoes text,
  observacoes_internas text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendas_select" ON public.vendas FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "vendas_insert" ON public.vendas FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "vendas_update" ON public.vendas FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "vendas_delete" ON public.vendas FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_vendas_empresa ON public.vendas(empresa_representada_id);
CREATE INDEX idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX idx_vendas_status ON public.vendas(status);
CREATE INDEX idx_vendas_data ON public.vendas(data_venda);
CREATE INDEX idx_vendas_deleted ON public.vendas(deleted_at);
CREATE TRIGGER trg_vendas_updated BEFORE UPDATE ON public.vendas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ITENS_VENDA ============
CREATE TABLE public.itens_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  venda_id uuid NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id),
  servico_id uuid REFERENCES public.servicos(id),
  descricao varchar(255) NOT NULL,
  quantidade numeric(15,3) NOT NULL DEFAULT 1,
  unidade varchar(20),
  preco_unitario numeric(15,2) NOT NULL DEFAULT 0,
  desconto_item numeric(15,2) DEFAULT 0,
  acrescimo_item numeric(15,2) DEFAULT 0,
  valor_total_item numeric(15,2) DEFAULT 0,
  ordem integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_venda TO authenticated;
GRANT ALL ON public.itens_venda TO service_role;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_venda_select" ON public.itens_venda FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "itens_venda_insert" ON public.itens_venda FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "itens_venda_update" ON public.itens_venda FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "itens_venda_delete" ON public.itens_venda FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_itens_venda_empresa ON public.itens_venda(empresa_representada_id);
CREATE INDEX idx_itens_venda_venda ON public.itens_venda(venda_id);
CREATE INDEX idx_itens_venda_produto ON public.itens_venda(produto_id);
CREATE INDEX idx_itens_venda_servico ON public.itens_venda(servico_id);
CREATE TRIGGER trg_itens_venda_updated BEFORE UPDATE ON public.itens_venda FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONTRATOS ============
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  cliente_id uuid REFERENCES public.clientes(id),
  numero_contrato varchar(50),
  titulo varchar(255) NOT NULL,
  descricao text,
  tipo varchar(50),
  status varchar(30) DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','ATIVO','SUSPENSO','ENCERRADO','CANCELADO')),
  data_inicio date,
  data_fim date,
  valor_mensal numeric(15,2) DEFAULT 0,
  valor_total numeric(15,2) DEFAULT 0,
  dia_vencimento integer CHECK (dia_vencimento BETWEEN 1 AND 31),
  plano_pagamento_id uuid REFERENCES public.planos_pagamento(id),
  renovacao_automatica boolean DEFAULT false,
  gera_financeiro boolean DEFAULT true,
  observacoes text,
  arquivo_url text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratos_select" ON public.contratos FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "contratos_insert" ON public.contratos FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "contratos_update" ON public.contratos FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "contratos_delete" ON public.contratos FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_contratos_empresa ON public.contratos(empresa_representada_id);
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_status ON public.contratos(status);
CREATE INDEX idx_contratos_data_inicio ON public.contratos(data_inicio);
CREATE INDEX idx_contratos_data_fim ON public.contratos(data_fim);
CREATE INDEX idx_contratos_deleted ON public.contratos(deleted_at);
CREATE TRIGGER trg_contratos_updated BEFORE UPDATE ON public.contratos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SYNC_LOGS (imutável) ============
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid REFERENCES public.empresas_representadas(id),
  tipo varchar(100) NOT NULL,
  status varchar(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','PROCESSANDO','SUCESSO','ERRO','IGNORADO')),
  origem varchar(100),
  destino varchar(100),
  payload_entrada jsonb,
  payload_saida jsonb,
  mensagem_erro text,
  tentativas integer DEFAULT 0,
  max_tentativas integer DEFAULT 3,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sync_logs TO authenticated;
GRANT ALL ON public.sync_logs TO service_role;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_logs_select" ON public.sync_logs FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "sync_logs_insert" ON public.sync_logs FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_sync_logs_empresa ON public.sync_logs(empresa_representada_id);
CREATE INDEX idx_sync_logs_tipo ON public.sync_logs(tipo);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_created ON public.sync_logs(created_at);

-- ============ SYNC_QUEUE ============
CREATE TABLE public.sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid REFERENCES public.empresas_representadas(id),
  tipo varchar(100) NOT NULL,
  status varchar(20) DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO','PROCESSANDO','CONCLUIDO','ERRO','CANCELADO')),
  prioridade integer DEFAULT 5,
  payload jsonb,
  tentativas integer DEFAULT 0,
  max_tentativas integer DEFAULT 3,
  proxima_tentativa_em timestamptz,
  processado_em timestamptz,
  erro_detalhes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_queue TO authenticated;
GRANT ALL ON public.sync_queue TO service_role;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_queue_select" ON public.sync_queue FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "sync_queue_insert" ON public.sync_queue FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "sync_queue_update" ON public.sync_queue FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "sync_queue_delete" ON public.sync_queue FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_sync_queue_empresa ON public.sync_queue(empresa_representada_id);
CREATE INDEX idx_sync_queue_tipo ON public.sync_queue(tipo);
CREATE INDEX idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX idx_sync_queue_prioridade ON public.sync_queue(prioridade);
CREATE INDEX idx_sync_queue_proxima ON public.sync_queue(proxima_tentativa_em);
CREATE TRIGGER trg_sync_queue_updated BEFORE UPDATE ON public.sync_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WEBHOOK_CONFIGS ============
CREATE TABLE public.webhook_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  nome varchar(255) NOT NULL,
  url_destino text NOT NULL,
  metodo varchar(10) DEFAULT 'POST',
  headers jsonb DEFAULT '{}'::jsonb,
  eventos jsonb DEFAULT '[]'::jsonb,
  secret_token text,
  ativo boolean DEFAULT true,
  max_tentativas integer DEFAULT 3,
  timeout_segundos integer DEFAULT 30,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_configs TO authenticated;
GRANT ALL ON public.webhook_configs TO service_role;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_configs_select" ON public.webhook_configs FOR SELECT TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "webhook_configs_insert" ON public.webhook_configs FOR INSERT TO authenticated WITH CHECK (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "webhook_configs_update" ON public.webhook_configs FOR UPDATE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE POLICY "webhook_configs_delete" ON public.webhook_configs FOR DELETE TO authenticated USING (empresa_representada_id = get_user_empresa_id() OR has_role(auth.uid(),'admin'));
CREATE INDEX idx_webhook_configs_empresa ON public.webhook_configs(empresa_representada_id);
CREATE INDEX idx_webhook_configs_ativo ON public.webhook_configs(ativo);
CREATE TRIGGER trg_webhook_configs_updated BEFORE UPDATE ON public.webhook_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
