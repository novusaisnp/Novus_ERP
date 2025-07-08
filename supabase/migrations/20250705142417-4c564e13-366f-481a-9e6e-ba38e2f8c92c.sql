
-- Habilitar RLS na tabela cargos
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir acesso total para usuários autenticados
CREATE POLICY "Users can view cargos" 
  ON public.cargos 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert cargos" 
  ON public.cargos 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update cargos" 
  ON public.cargos 
  FOR UPDATE 
  USING (true);

CREATE POLICY "Users can delete cargos" 
  ON public.cargos 
  FOR DELETE 
  USING (true);
