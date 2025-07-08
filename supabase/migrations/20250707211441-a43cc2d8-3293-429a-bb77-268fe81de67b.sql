-- FASE 1: Preparação do Banco de Dados para Integração

-- Tabela de logs de sincronização
CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL, -- 'insert', 'update', 'delete', 'sync'
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(255) NOT NULL,
  source_system VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'error'
  data_payload JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de configuração de webhooks
CREATE TABLE public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_system VARCHAR(100) NOT NULL UNIQUE,
  webhook_url VARCHAR(500) NOT NULL,
  webhook_secret VARCHAR(255) NOT NULL,
  events JSONB NOT NULL DEFAULT '[]', -- Array de eventos que este webhook escuta
  active BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER DEFAULT 1000, -- Requisições por minuto
  timeout_seconds INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de filas de processamento
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 0, -- 0 = normal, 1 = alto, 2 = crítico
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabelas de negócio para dados sincronizados

-- Tabela de vendas (dados do PDV)
CREATE TABLE public.vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_venda VARCHAR(100) NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  data_venda TIMESTAMPTZ NOT NULL,
  valor_total DECIMAL(15,2) NOT NULL,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  valor_acrescimo DECIMAL(15,2) DEFAULT 0,
  itens JSONB NOT NULL DEFAULT '[]',
  forma_pagamento VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'finalizada', -- 'finalizada', 'cancelada', 'pendente'
  observacoes TEXT,
  source_system VARCHAR(100),
  sync_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contratos (dados do CRM)
CREATE TABLE public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato VARCHAR(100) NOT NULL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_mensal DECIMAL(15,2),
  valor_total DECIMAL(15,2),
  status VARCHAR(50) NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'cancelado', 'vencido'
  servicos JSONB DEFAULT '[]',
  observacoes TEXT,
  responsavel VARCHAR(255),
  source_system VARCHAR(100),
  sync_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de contas a receber (dados financeiros)
CREATE TABLE public.contas_receber (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_documento VARCHAR(100) NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  venda_id UUID REFERENCES public.vendas(id),
  contrato_id UUID REFERENCES public.contratos(id),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  valor_original DECIMAL(15,2) NOT NULL,
  valor_pago DECIMAL(15,2) DEFAULT 0,
  valor_desconto DECIMAL(15,2) DEFAULT 0,
  situacao VARCHAR(50) NOT NULL DEFAULT 'ABERTA', -- 'ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA'
  forma_pagamento VARCHAR(100),
  observacoes TEXT,
  source_system VARCHAR(100),
  sync_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar campos de sincronização na tabela de clientes existente
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS source_system VARCHAR(100);
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS sync_metadata JSONB DEFAULT '{}';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - sync_logs" 
  ON public.sync_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - webhook_configs" 
  ON public.webhook_configs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - sync_queue" 
  ON public.sync_queue FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - vendas" 
  ON public.vendas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - contratos" 
  ON public.contratos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - contas_receber" 
  ON public.contas_receber FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_sync_logs_table_record ON public.sync_logs(table_name, record_id);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX idx_sync_logs_source_system ON public.sync_logs(source_system);
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at);

CREATE INDEX idx_webhook_configs_target_system ON public.webhook_configs(target_system);
CREATE INDEX idx_webhook_configs_active ON public.webhook_configs(active);

CREATE INDEX idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX idx_sync_queue_scheduled_for ON public.sync_queue(scheduled_for);
CREATE INDEX idx_sync_queue_priority ON public.sync_queue(priority);

CREATE INDEX idx_vendas_numero ON public.vendas(numero_venda);
CREATE INDEX idx_vendas_cliente ON public.vendas(cliente_id);
CREATE INDEX idx_vendas_data ON public.vendas(data_venda);
CREATE INDEX idx_vendas_source_system ON public.vendas(source_system);

CREATE INDEX idx_contratos_numero ON public.contratos(numero_contrato);
CREATE INDEX idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX idx_contratos_status ON public.contratos(status);

CREATE INDEX idx_contas_receber_cliente ON public.contas_receber(cliente_id);
CREATE INDEX idx_contas_receber_vencimento ON public.contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_situacao ON public.contas_receber(situacao);

CREATE INDEX idx_clientes_external_id ON public.clientes(external_id);
CREATE INDEX idx_clientes_source_system ON public.clientes(source_system);

-- Triggers para updated_at
CREATE TRIGGER trigger_sync_logs_updated_at
  BEFORE UPDATE ON public.sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_sync_queue_updated_at
  BEFORE UPDATE ON public.sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_contas_receber_updated_at
  BEFORE UPDATE ON public.contas_receber
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.sync_logs IS 'Log de todas as operações de sincronização entre sistemas';
COMMENT ON TABLE public.webhook_configs IS 'Configurações de webhooks para sistemas externos';
COMMENT ON TABLE public.sync_queue IS 'Fila de processamento para operações de sincronização';
COMMENT ON TABLE public.vendas IS 'Vendas sincronizadas do sistema PDV';
COMMENT ON TABLE public.contratos IS 'Contratos sincronizados do sistema CRM';
COMMENT ON TABLE public.contas_receber IS 'Contas a receber geradas pelas vendas e contratos';

-- Função para limpeza automática de logs antigos (manter apenas últimos 90 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sync_logs 
  WHERE created_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;