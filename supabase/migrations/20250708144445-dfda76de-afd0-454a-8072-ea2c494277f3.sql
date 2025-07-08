-- Criar tabela para histórico de movimentações financeiras
CREATE TABLE public.historico_movimentacoes_financeiras (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo_id UUID NOT NULL,
    tipo_titulo TEXT NOT NULL CHECK (tipo_titulo IN ('CONTAS_PAGAR', 'CONTAS_RECEBER')),
    tipo_operacao TEXT NOT NULL CHECK (tipo_operacao IN ('CRIACAO', 'EDICAO', 'LIQUIDACAO', 'ESTORNO', 'CANCELAMENTO')),
    dados_anteriores JSONB,
    dados_novos JSONB,
    valor_movimentado NUMERIC,
    data_operacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    usuario_id UUID REFERENCES auth.users(id),
    usuario_nome TEXT,
    ip_origem INET,
    observacoes TEXT,
    metadados JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para documentos anexos aos títulos
CREATE TABLE public.documentos_titulos_financeiros (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo_id UUID NOT NULL,
    tipo_titulo TEXT NOT NULL CHECK (tipo_titulo IN ('CONTAS_PAGAR', 'CONTAS_RECEBER')),
    nome_arquivo TEXT NOT NULL,
    nome_original TEXT NOT NULL,
    tipo_arquivo TEXT NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    url_arquivo TEXT NOT NULL,
    categoria TEXT CHECK (categoria IN ('NOTA_FISCAL', 'CONTRATO', 'COMPROVANTE', 'OUTROS')),
    descricao TEXT,
    versao INTEGER NOT NULL DEFAULT 1,
    ativo BOOLEAN NOT NULL DEFAULT true,
    upload_usuario_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para liquidações de títulos (baixas e pagamentos)
CREATE TABLE public.liquidacoes_titulos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo_id UUID NOT NULL,
    tipo_titulo TEXT NOT NULL CHECK (tipo_titulo IN ('CONTAS_PAGAR', 'CONTAS_RECEBER')),
    valor_pago NUMERIC NOT NULL,
    data_pagamento DATE NOT NULL,
    forma_pagamento TEXT NOT NULL CHECK (forma_pagamento IN ('DINHEIRO', 'TRANSFERENCIA', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'CHEQUE', 'DEPOSITO')),
    conta_bancaria_id UUID,
    conta_bancaria_destino_id UUID,
    numero_documento_baixa TEXT,
    observacoes TEXT,
    juros_pagos NUMERIC DEFAULT 0,
    multa_paga NUMERIC DEFAULT 0,
    desconto_concedido NUMERIC DEFAULT 0,
    valor_original_titulo NUMERIC NOT NULL,
    valor_restante NUMERIC NOT NULL DEFAULT 0,
    liquidacao_completa BOOLEAN NOT NULL DEFAULT true,
    estornado BOOLEAN NOT NULL DEFAULT false,
    data_estorno TIMESTAMP WITH TIME ZONE,
    motivo_estorno TEXT,
    usuario_liquidacao_id UUID REFERENCES auth.users(id),
    usuario_estorno_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para múltiplas baixas de um mesmo título
CREATE TABLE public.liquidacoes_multiplas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    liquidacao_principal_id UUID NOT NULL REFERENCES public.liquidacoes_titulos(id) ON DELETE CASCADE,
    conta_bancaria_id UUID NOT NULL,
    valor NUMERIC NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.historico_movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_titulos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacoes_titulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacoes_multiplas ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Permitir acesso total para usuários autenticados - historico_mov"
ON public.historico_movimentacoes_financeiras
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - documentos_tit"
ON public.documentos_titulos_financeiros
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - liquidacoes"
ON public.liquidacoes_titulos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - liquidacoes_mult"
ON public.liquidacoes_multiplas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX idx_historico_titulo_id ON public.historico_movimentacoes_financeiras(titulo_id);
CREATE INDEX idx_historico_tipo_titulo ON public.historico_movimentacoes_financeiras(tipo_titulo);
CREATE INDEX idx_historico_data_operacao ON public.historico_movimentacoes_financeiras(data_operacao);

CREATE INDEX idx_documentos_titulo_id ON public.documentos_titulos_financeiros(titulo_id);
CREATE INDEX idx_documentos_tipo_titulo ON public.documentos_titulos_financeiros(tipo_titulo);
CREATE INDEX idx_documentos_ativo ON public.documentos_titulos_financeiros(ativo);

CREATE INDEX idx_liquidacoes_titulo_id ON public.liquidacoes_titulos(titulo_id);
CREATE INDEX idx_liquidacoes_tipo_titulo ON public.liquidacoes_titulos(tipo_titulo);
CREATE INDEX idx_liquidacoes_data_pagamento ON public.liquidacoes_titulos(data_pagamento);
CREATE INDEX idx_liquidacoes_estornado ON public.liquidacoes_titulos(estornado);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_documentos_titulos_updated_at
    BEFORE UPDATE ON public.documentos_titulos_financeiros
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_liquidacoes_titulos_updated_at
    BEFORE UPDATE ON public.liquidacoes_titulos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();