
-- Alterar a coluna agencia_id para permitir valores null em contas cofre
ALTER TABLE public.contas_bancarias 
ALTER COLUMN agencia_id DROP NOT NULL;

-- Adicionar constraint para garantir que contas não-cofre tenham agencia_id
ALTER TABLE public.contas_bancarias 
ADD CONSTRAINT check_agencia_conta_cofre 
CHECK (
  (conta_cofre = true AND agencia_id IS NULL) OR 
  (conta_cofre = false AND agencia_id IS NOT NULL)
);
