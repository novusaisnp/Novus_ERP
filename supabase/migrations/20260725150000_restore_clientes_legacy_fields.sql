-- Mesmo padrão dos casos anteriores (contas_bancarias, agencias_bancarias, bancos,
-- modalidade_api_vinculo): a tabela clientes foi achatada no redesenho de
-- 20260710135935 (endereço/qualificação fiscal/dados pessoais deixaram de ser jsonb
-- estruturado e viraram colunas soltas: bairro/cep/cidade/cnpj/cpf/...), mas o
-- formulário real de cadastro de cliente (FormCliente.tsx, com CNAE, dados PF/PJ,
-- múltiplos contatos, upload de documentos) nunca foi atualizado - continua gravando
-- no formato jsonb estruturado antigo, em colunas que não existem mais. Essa é a
-- tabela mais central do sistema (usada por Vendas, Contratos, Contas a Receber);
-- criar/editar qualquer cliente hoje provavelmente falha.
--
-- Restaura as colunas antigas ao lado das novas (sem tocar nas novas: cpf, cnpj,
-- tipo_pessoa, bairro/cep/cidade/logradouro/numero/complemento/estado,
-- inscricao_estadual, inscricao_municipal continuam existindo e sem uso duplo aqui -
-- só o service precisa parar de gravar em colunas fantasmas).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS apelido text,
  ADD COLUMN IF NOT EXISTS cpf_cnpj text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS endereco jsonb,
  ADD COLUMN IF NOT EXISTS qualificacao_fiscal jsonb,
  ADD COLUMN IF NOT EXISTS cnae text,
  ADD COLUMN IF NOT EXISTS site text,
  ADD COLUMN IF NOT EXISTS forma_atuacao text,
  ADD COLUMN IF NOT EXISTS data_fundacao date,
  ADD COLUMN IF NOT EXISTS atividade_principal text,
  ADD COLUMN IF NOT EXISTS contato_empresa jsonb,
  ADD COLUMN IF NOT EXISTS contatos jsonb,
  ADD COLUMN IF NOT EXISTS documentos jsonb,
  ADD COLUMN IF NOT EXISTS emails text[],
  ADD COLUMN IF NOT EXISTS telefones text[],
  ADD COLUMN IF NOT EXISTS dados_pessoais jsonb,
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores_empresa(id);

CREATE INDEX IF NOT EXISTS idx_clientes_setor_id ON public.clientes(setor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON public.clientes(tipo);
