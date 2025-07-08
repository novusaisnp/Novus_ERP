-- Criar tabela de setores da empresa para futura integração CRM
CREATE TABLE public.setores_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descricao VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir alguns setores padrão
INSERT INTO public.setores_empresa (codigo, descricao) VALUES
('ADM', 'Administrativo'),
('VEN', 'Vendas'),
('COM', 'Compras'),
('FIN', 'Financeiro'),
('RH', 'Recursos Humanos'),
('TI', 'Tecnologia da Informação'),
('MKT', 'Marketing'),
('JUR', 'Jurídico'),
('LOG', 'Logística'),
('PRO', 'Produção'),
('QUA', 'Qualidade'),
('DIR', 'Diretoria');

-- Adicionar campo setor_id na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES public.setores_empresa(id);

-- Habilitar RLS na tabela setores_empresa
ALTER TABLE public.setores_empresa ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para setores_empresa
CREATE POLICY "Permitir acesso total para usuários autenticados - setores_empresa" 
ON public.setores_empresa
FOR ALL 
USING (true)
WITH CHECK (true);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_setores_empresa_updated_at
    BEFORE UPDATE ON public.setores_empresa
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();