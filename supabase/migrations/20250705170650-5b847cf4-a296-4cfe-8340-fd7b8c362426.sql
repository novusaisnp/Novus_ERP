
-- Habilitar RLS na tabela colaboradores se ainda não estiver habilitado
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir acesso completo aos usuários autenticados
-- (mesma abordagem usada nas outras tabelas do sistema)
CREATE POLICY "Permitir acesso total para usuários autenticados - colaboradores" 
  ON public.colaboradores 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
