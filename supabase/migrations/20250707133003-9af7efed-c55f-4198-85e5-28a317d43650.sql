
-- Tabela para Natureza de Caixas
CREATE TABLE public.natureza_caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  sigla VARCHAR(5) NOT NULL,
  baixa BOOLEAN NOT NULL DEFAULT false,
  gera_troco BOOLEAN NOT NULL DEFAULT false,
  informa_valor_pago BOOLEAN NOT NULL DEFAULT false,
  baixa_pendente BOOLEAN NOT NULL DEFAULT false,
  pagamento_online BOOLEAN NOT NULL DEFAULT false,
  conta_convenio BOOLEAN NOT NULL DEFAULT false,
  mostra_troco BOOLEAN NOT NULL DEFAULT false,
  forma_nota_fiscal BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Modalidade de Caixa
CREATE TABLE public.modalidade_caixas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  sigla VARCHAR(5) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  indica_boleto BOOLEAN NOT NULL DEFAULT false,
  indica_cartao_credito BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Planos de Pagamento
CREATE TABLE public.planos_pagamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_plano VARCHAR NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para Modalidade API Vínculo
CREATE TABLE public.modalidade_api_vinculo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  codigo_externo VARCHAR,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar RLS (Row Level Security) nas tabelas
ALTER TABLE public.natureza_caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidade_caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modalidade_api_vinculo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - natureza_caixas" 
  ON public.natureza_caixas 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - modalidade_caixas" 
  ON public.modalidade_caixas 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - planos_pagamento" 
  ON public.planos_pagamento 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permitir acesso total para usuários autenticados - modalidade_api_vinculo" 
  ON public.modalidade_api_vinculo 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_natureza_caixas_updated_at
  BEFORE UPDATE ON public.natureza_caixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modalidade_caixas_updated_at
  BEFORE UPDATE ON public.modalidade_caixas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planos_pagamento_updated_at
  BEFORE UPDATE ON public.planos_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modalidade_api_vinculo_updated_at
  BEFORE UPDATE ON public.modalidade_api_vinculo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
