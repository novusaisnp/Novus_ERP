
-- Criar tabela para centros de custo
CREATE TABLE public.centros_custo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(100),
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice único para o nome (evitar duplicatas)
CREATE UNIQUE INDEX idx_centros_custo_nome ON public.centros_custo(nome);

-- Habilitar RLS
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - centros_custo" 
  ON public.centros_custo 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_centros_custo_updated_at 
  BEFORE UPDATE ON public.centros_custo 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
