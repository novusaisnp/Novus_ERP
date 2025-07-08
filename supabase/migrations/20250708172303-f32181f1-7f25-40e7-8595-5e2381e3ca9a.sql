-- Criar tabela para movimentações bancárias
CREATE TABLE public.movimentacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conta_bancaria_id UUID NOT NULL REFERENCES public.contas_bancarias(id),
  tipo_movimentacao VARCHAR(20) NOT NULL CHECK (tipo_movimentacao IN ('DEPOSITO', 'SAQUE', 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO')),
  valor NUMERIC(15,2) NOT NULL CHECK (valor > 0),
  descricao TEXT NOT NULL,
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  documento_referencia VARCHAR(100),
  observacoes TEXT,
  
  -- Dados para transferências
  conta_destino_id UUID REFERENCES public.contas_bancarias(id),
  
  -- Dados para conciliação
  conciliado BOOLEAN NOT NULL DEFAULT false,
  data_conciliacao TIMESTAMP WITH TIME ZONE,
  usuario_conciliacao_id UUID,
  
  -- Dados de controle
  estornado BOOLEAN NOT NULL DEFAULT false,
  data_estorno TIMESTAMP WITH TIME ZONE,
  usuario_estorno_id UUID,
  motivo_estorno TEXT,
  movimentacao_estorno_id UUID REFERENCES public.movimentacoes_bancarias(id),
  
  -- Auditoria
  usuario_criacao_id UUID,
  ip_origem INET,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Criar tabela para lotes de movimentações (para transferências múltiplas)
CREATE TABLE public.lotes_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_lote VARCHAR(50) NOT NULL UNIQUE,
  descricao_lote TEXT NOT NULL,
  tipo_lote VARCHAR(20) NOT NULL CHECK (tipo_lote IN ('TRANSFERENCIA_MULTIPLA', 'DEPOSITO_MULTIPLO', 'AJUSTE_MULTIPLO')),
  valor_total NUMERIC(15,2) NOT NULL,
  quantidade_movimentacoes INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PROCESSANDO' CHECK (status IN ('PROCESSANDO', 'FINALIZADO', 'CANCELADO')),
  
  -- Auditoria
  usuario_criacao_id UUID,
  ip_origem INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar referência ao lote na tabela de movimentações
ALTER TABLE public.movimentacoes_bancarias 
ADD COLUMN lote_id UUID REFERENCES public.lotes_movimentacoes(id);

-- Criar tabela para documentos anexados às movimentações
CREATE TABLE public.documentos_movimentacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movimentacao_id UUID NOT NULL REFERENCES public.movimentacoes_bancarias(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  nome_original TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL,
  url_arquivo TEXT NOT NULL,
  categoria VARCHAR(50), -- 'comprovante', 'nota_fiscal', 'contrato', etc.
  descricao TEXT,
  
  -- Auditoria
  usuario_upload_id UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para histórico de movimentações
CREATE TABLE public.historico_movimentacoes_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movimentacao_id UUID NOT NULL,
  tipo_operacao VARCHAR(20) NOT NULL CHECK (tipo_operacao IN ('CRIACAO', 'EDICAO', 'ESTORNO', 'CONCILIACAO', 'EXCLUSAO')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  observacoes TEXT,
  
  -- Auditoria
  usuario_id UUID,
  usuario_nome TEXT,
  ip_origem INET,
  data_operacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para otimização
CREATE INDEX idx_movimentacoes_bancarias_conta_id ON public.movimentacoes_bancarias(conta_bancaria_id);
CREATE INDEX idx_movimentacoes_bancarias_data ON public.movimentacoes_bancarias(data_movimentacao);
CREATE INDEX idx_movimentacoes_bancarias_tipo ON public.movimentacoes_bancarias(tipo_movimentacao);
CREATE INDEX idx_movimentacoes_bancarias_conciliado ON public.movimentacoes_bancarias(conciliado);
CREATE INDEX idx_movimentacoes_bancarias_estornado ON public.movimentacoes_bancarias(estornado);
CREATE INDEX idx_movimentacoes_bancarias_ativo ON public.movimentacoes_bancarias(ativo);
CREATE INDEX idx_movimentacoes_bancarias_lote ON public.movimentacoes_bancarias(lote_id);

CREATE INDEX idx_lotes_movimentacoes_numero ON public.lotes_movimentacoes(numero_lote);
CREATE INDEX idx_lotes_movimentacoes_status ON public.lotes_movimentacoes(status);

CREATE INDEX idx_documentos_movimentacoes_movimentacao ON public.documentos_movimentacoes_bancarias(movimentacao_id);
CREATE INDEX idx_historico_movimentacoes_movimentacao ON public.historico_movimentacoes_bancarias(movimentacao_id);

-- Habilitar RLS
ALTER TABLE public.movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_movimentacoes_bancarias ENABLE ROW LEVEL SECURITY;

-- Criar políticas de RLS
CREATE POLICY "Permitir acesso total para usuários autenticados - movimentacoes_bancarias" 
  ON public.movimentacoes_bancarias 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - lotes_movimentacoes" 
  ON public.lotes_movimentacoes 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - documentos_movimentacoes_bancarias" 
  ON public.documentos_movimentacoes_bancarias 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - historico_movimentacoes_bancarias" 
  ON public.historico_movimentacoes_bancarias 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_movimentacoes_bancarias_updated_at 
  BEFORE UPDATE ON public.movimentacoes_bancarias 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lotes_movimentacoes_updated_at 
  BEFORE UPDATE ON public.lotes_movimentacoes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documentos_movimentacoes_bancarias_updated_at 
  BEFORE UPDATE ON public.documentos_movimentacoes_bancarias 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar saldo da conta após movimentação
CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Para inserções
    IF TG_OP = 'INSERT' THEN
        -- Depósitos, transferências de entrada e ajustes positivos aumentam o saldo
        IF NEW.tipo_movimentacao IN ('DEPOSITO', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO') THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual + NEW.valor,
                updated_at = now()
            WHERE id = NEW.conta_bancaria_id;
        END IF;
        
        -- Saques, transferências de saída e ajustes negativos diminuem o saldo
        IF NEW.tipo_movimentacao IN ('SAQUE', 'TRANSFERENCIA_SAIDA', 'AJUSTE_NEGATIVO') THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual - NEW.valor,
                updated_at = now()
            WHERE id = NEW.conta_bancaria_id;
        END IF;
        
        -- Para transferências, atualizar também a conta destino
        IF NEW.tipo_movimentacao = 'TRANSFERENCIA_SAIDA' AND NEW.conta_destino_id IS NOT NULL THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual + NEW.valor,
                updated_at = now()
            WHERE id = NEW.conta_destino_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Para deleções ou estornos
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.estornado = true AND OLD.estornado = false) THEN
        -- Reverter o efeito da movimentação original
        IF OLD.tipo_movimentacao IN ('DEPOSITO', 'TRANSFERENCIA_ENTRADA', 'AJUSTE_POSITIVO') THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual - OLD.valor,
                updated_at = now()
            WHERE id = OLD.conta_bancaria_id;
        END IF;
        
        IF OLD.tipo_movimentacao IN ('SAQUE', 'TRANSFERENCIA_SAIDA', 'AJUSTE_NEGATIVO') THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual + OLD.valor,
                updated_at = now()
            WHERE id = OLD.conta_bancaria_id;
        END IF;
        
        -- Para transferências, reverter também na conta destino
        IF OLD.tipo_movimentacao = 'TRANSFERENCIA_SAIDA' AND OLD.conta_destino_id IS NOT NULL THEN
            UPDATE public.contas_bancarias 
            SET saldo_atual = saldo_atual - OLD.valor,
                updated_at = now()
            WHERE id = OLD.conta_destino_id;
        END IF;
        
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para atualizar saldo automaticamente
CREATE TRIGGER trigger_atualizar_saldo_conta_movimentacao
    AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_bancarias
    FOR EACH ROW
    EXECUTE FUNCTION public.atualizar_saldo_conta_movimentacao();

-- Função para registrar histórico de movimentações
CREATE OR REPLACE FUNCTION public.registrar_historico_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.historico_movimentacoes_bancarias (
            movimentacao_id,
            tipo_operacao,
            dados_novos,
            usuario_id,
            ip_origem
        ) VALUES (
            NEW.id,
            'CRIACAO',
            to_jsonb(NEW),
            NEW.usuario_criacao_id,
            NEW.ip_origem
        );
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'UPDATE' THEN
        -- Determinar o tipo de operação
        IF NEW.estornado = true AND OLD.estornado = false THEN
            INSERT INTO public.historico_movimentacoes_bancarias (
                movimentacao_id,
                tipo_operacao,
                dados_anteriores,
                dados_novos,
                usuario_id,
                observacoes
            ) VALUES (
                NEW.id,
                'ESTORNO',
                to_jsonb(OLD),
                to_jsonb(NEW),
                NEW.usuario_estorno_id,
                NEW.motivo_estorno
            );
        ELSIF NEW.conciliado = true AND OLD.conciliado = false THEN
            INSERT INTO public.historico_movimentacoes_bancarias (
                movimentacao_id,
                tipo_operacao,
                dados_anteriores,
                dados_novos,
                usuario_id
            ) VALUES (
                NEW.id,
                'CONCILIACAO',
                to_jsonb(OLD),
                to_jsonb(NEW),
                NEW.usuario_conciliacao_id
            );
        ELSE
            INSERT INTO public.historico_movimentacoes_bancarias (
                movimentacao_id,
                tipo_operacao,
                dados_anteriores,
                dados_novos,
                usuario_id
            ) VALUES (
                NEW.id,
                'EDICAO',
                to_jsonb(OLD),
                to_jsonb(NEW),
                NEW.usuario_criacao_id
            );
        END IF;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.historico_movimentacoes_bancarias (
            movimentacao_id,
            tipo_operacao,
            dados_anteriores,
            usuario_id
        ) VALUES (
            OLD.id,
            'EXCLUSAO',
            to_jsonb(OLD),
            OLD.usuario_criacao_id
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Trigger para registrar histórico automaticamente
CREATE TRIGGER trigger_registrar_historico_movimentacao
    AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_bancarias
    FOR EACH ROW
    EXECUTE FUNCTION public.registrar_historico_movimentacao();

-- Função para validar transferências
CREATE OR REPLACE FUNCTION public.validar_transferencia_movimentacao()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validar transferências de saída
    IF NEW.tipo_movimentacao = 'TRANSFERENCIA_SAIDA' THEN
        IF NEW.conta_destino_id IS NULL THEN
            RAISE EXCEPTION 'Conta destino é obrigatória para transferências de saída';
        END IF;
        
        IF NEW.conta_destino_id = NEW.conta_bancaria_id THEN
            RAISE EXCEPTION 'Conta destino não pode ser igual à conta origem';
        END IF;
        
        -- Verificar se a conta destino existe e está ativa
        IF NOT EXISTS (
            SELECT 1 FROM public.contas_bancarias 
            WHERE id = NEW.conta_destino_id 
            AND ativo = true 
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Conta destino não encontrada ou inativa';
        END IF;
    END IF;
    
    -- Validar se transferências de entrada não podem ter conta destino
    IF NEW.tipo_movimentacao = 'TRANSFERENCIA_ENTRADA' AND NEW.conta_destino_id IS NOT NULL THEN
        RAISE EXCEPTION 'Transferências de entrada não devem ter conta destino';
    END IF;
    
    -- Verificar se a conta origem existe e está ativa
    IF NOT EXISTS (
        SELECT 1 FROM public.contas_bancarias 
        WHERE id = NEW.conta_bancaria_id 
        AND ativo = true 
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Conta bancária não encontrada ou inativa';
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger para validar transferências
CREATE TRIGGER trigger_validar_transferencia_movimentacao
    BEFORE INSERT OR UPDATE ON public.movimentacoes_bancarias
    FOR EACH ROW
    EXECUTE FUNCTION public.validar_transferencia_movimentacao();