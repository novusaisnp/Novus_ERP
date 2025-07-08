
-- Criar tabela para plano de contas
CREATE TABLE public.plano_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
  id_pai UUID REFERENCES public.plano_contas(id) ON DELETE RESTRICT,
  nivel INTEGER NOT NULL CHECK (nivel >= 1 AND nivel <= 5),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para otimização
CREATE INDEX idx_plano_contas_codigo ON public.plano_contas(codigo);
CREATE INDEX idx_plano_contas_id_pai ON public.plano_contas(id_pai);
CREATE INDEX idx_plano_contas_nivel ON public.plano_contas(nivel);
CREATE INDEX idx_plano_contas_tipo ON public.plano_contas(tipo);

-- Criar índice único para códigos (não podem duplicar)
CREATE UNIQUE INDEX idx_plano_contas_codigo_unique ON public.plano_contas(codigo);

-- Habilitar RLS
ALTER TABLE public.plano_contas ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir acesso total para usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - plano_contas" 
  ON public.plano_contas 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_plano_contas_updated_at 
  BEFORE UPDATE ON public.plano_contas 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados iniciais básicos para demonstração
INSERT INTO public.plano_contas (codigo, nome, tipo, nivel) VALUES
('1', 'RECEITAS', 'RECEITA', 1),
('1.1', 'Receitas Operacionais', 'RECEITA', 2),
('1.1.1', 'Vendas de Produtos', 'RECEITA', 3),
('1.1.2', 'Prestação de Serviços', 'RECEITA', 3),
('2', 'DESPESAS', 'DESPESA', 1),
('2.1', 'Despesas Operacionais', 'DESPESA', 2),
('2.1.1', 'Custos dos Produtos Vendidos', 'DESPESA', 3),
('2.1.2', 'Despesas Administrativas', 'DESPESA', 3),
('2.1.3', 'Despesas Comerciais', 'DESPESA', 3);
