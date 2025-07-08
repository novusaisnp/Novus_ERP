
-- Verificar se a tabela contas_bancarias já existe e tem as colunas necessárias
-- Adicionar colunas que podem estar faltando para o submódulo de Contas

-- Verificar se existe coluna conta_cofre
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_bancarias' 
    AND column_name = 'conta_cofre'
  ) THEN
    ALTER TABLE public.contas_bancarias 
    ADD COLUMN conta_cofre BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Verificar se existe coluna descricao para titular
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contas_bancarias' 
    AND column_name = 'descricao_conta'
  ) THEN
    ALTER TABLE public.contas_bancarias 
    ADD COLUMN descricao_conta TEXT;
  END IF;
END $$;

-- Atualizar constraints para permitir agencia_id nulo quando conta_cofre = true
ALTER TABLE public.contas_bancarias 
DROP CONSTRAINT IF EXISTS contas_bancarias_agencia_id_fkey;

ALTER TABLE public.contas_bancarias 
ADD CONSTRAINT contas_bancarias_agencia_id_fkey 
FOREIGN KEY (agencia_id) REFERENCES agencias_bancarias(id);

-- Adicionar constraint para validar que conta_cofre ou agencia_id devem estar preenchidos
ALTER TABLE public.contas_bancarias 
DROP CONSTRAINT IF EXISTS check_conta_cofre_ou_agencia;

ALTER TABLE public.contas_bancarias 
ADD CONSTRAINT check_conta_cofre_ou_agencia 
CHECK (
  (conta_cofre = true AND agencia_id IS NULL) OR 
  (conta_cofre = false AND agencia_id IS NOT NULL)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_conta_cofre ON public.contas_bancarias(conta_cofre);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_numero_conta ON public.contas_bancarias(numero_conta);
CREATE INDEX IF NOT EXISTS idx_contas_bancarias_titular ON public.contas_bancarias(titular);

-- Atualizar trigger para updated_at se não existir
DROP TRIGGER IF EXISTS update_contas_bancarias_updated_at ON public.contas_bancarias;
CREATE TRIGGER update_contas_bancarias_updated_at
  BEFORE UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
