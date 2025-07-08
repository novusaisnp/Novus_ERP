
-- Atualizar tabela clientes para suportar PF e PJ com campos fiscais completos
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS apelido VARCHAR(255),
ADD COLUMN IF NOT EXISTS rg VARCHAR(20),
ADD COLUMN IF NOT EXISTS data_nascimento DATE,
ADD COLUMN IF NOT EXISTS qualificacao_fiscal JSONB DEFAULT '{}';

-- Atualizar tabela fornecedores para qualificação fiscal completa
ALTER TABLE public.fornecedores 
ADD COLUMN IF NOT EXISTS qualificacao_fiscal JSONB DEFAULT '{}';

-- Criar índices para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes(tipo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON public.fornecedores(cnpj);

-- Adicionar comentários para documentar a estrutura
COMMENT ON COLUMN public.clientes.qualificacao_fiscal IS 'Dados fiscais: inscricao_estadual, inscricao_municipal, regime_tributario, porte';
COMMENT ON COLUMN public.fornecedores.qualificacao_fiscal IS 'Dados fiscais: inscricao_estadual, inscricao_municipal, regime_tributario, porte';
COMMENT ON COLUMN public.clientes.endereco IS 'Endereço completo em formato JSONB: cep, logradouro, numero, complemento, bairro, cidade, uf';
COMMENT ON COLUMN public.fornecedores.endereco IS 'Endereço completo em formato JSONB: cep, logradouro, numero, complemento, bairro, cidade, uf';
