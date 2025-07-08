-- Adicionar campo contatos à tabela clientes para gerenciar contatos estruturados para PJ
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS contatos jsonb DEFAULT '[]'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN public.clientes.contatos IS 'Lista de contatos estruturados para empresas PJ - cada contato possui nome, telefone, email, setor, cargo e flag principal';