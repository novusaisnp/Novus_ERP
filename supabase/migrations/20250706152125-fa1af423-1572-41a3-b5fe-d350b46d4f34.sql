
-- Criar tabela agencias_bancarias
CREATE TABLE public.agencias_bancarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banco_id UUID NOT NULL REFERENCES public.bancos(id),
  numero_agencia VARCHAR(10) NOT NULL,
  descricao VARCHAR(100) NOT NULL,
  endereco JSONB DEFAULT '{}',
  telefone VARCHAR(20),
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT agencias_bancarias_banco_numero_unique UNIQUE (banco_id, numero_agencia, deleted_at)
);

-- Habilitar RLS
ALTER TABLE public.agencias_bancarias ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total aos usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - agencias"
ON public.agencias_bancarias
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_agencias_bancarias_updated_at
    BEFORE UPDATE ON public.agencias_bancarias
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários na tabela
COMMENT ON TABLE public.agencias_bancarias IS 'Cadastro de agências bancárias vinculadas aos bancos';
COMMENT ON COLUMN public.agencias_bancarias.banco_id IS 'Referência ao banco (FK obrigatória)';
COMMENT ON COLUMN public.agencias_bancarias.numero_agencia IS 'Número da agência (máx 10 dígitos)';
COMMENT ON COLUMN public.agencias_bancarias.descricao IS 'Descrição/nome da agência';
COMMENT ON COLUMN public.agencias_bancarias.endereco IS 'Endereço completo em JSON (rua, numero, complemento, cidade, estado, cep)';
COMMENT ON COLUMN public.agencias_bancarias.telefone IS 'Telefone de contato da agência';
COMMENT ON COLUMN public.agencias_bancarias.deleted_at IS 'Data de arquivamento (soft delete)';
