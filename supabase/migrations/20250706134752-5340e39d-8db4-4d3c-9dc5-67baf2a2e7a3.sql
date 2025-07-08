
-- Criar tabela bancos
CREATE TABLE public.bancos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  sigla VARCHAR(10),
  pais VARCHAR(50) NOT NULL DEFAULT 'Brasil',
  ativo BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bancos_codigo_unique UNIQUE (codigo)
);

-- Habilitar RLS
ALTER TABLE public.bancos ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso total aos usuários autenticados
CREATE POLICY "Permitir acesso total para usuários autenticados - bancos"
ON public.bancos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bancos_updated_at
    BEFORE UPDATE ON public.bancos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários na tabela
COMMENT ON TABLE public.bancos IS 'Cadastro de instituições bancárias';
COMMENT ON COLUMN public.bancos.codigo IS 'Código identificador do banco (ex: 001, 341)';
COMMENT ON COLUMN public.bancos.nome IS 'Nome completo da instituição bancária';
COMMENT ON COLUMN public.bancos.sigla IS 'Sigla ou abreviação do banco';
COMMENT ON COLUMN public.bancos.pais IS 'País da instituição bancária';
COMMENT ON COLUMN public.bancos.deleted_at IS 'Data de arquivamento (soft delete)';
