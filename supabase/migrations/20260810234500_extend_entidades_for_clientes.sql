-- Cadastro Unificado de Entidades — Fase 2c (ERP): extensão pra Clientes
-- `clientes` (ao contrário de `fornecedores`) tem colunas jsonb/array reais
-- e testadas (ver docs/STATUS.md checkpoint 2026-08-09, "entrada testada de
-- ponta a ponta" com o satélite) — não é bug a corrigir, é enriquecimento
-- real de `entidades` que faltava. Aditivo, entidades ainda vazia.
ALTER TABLE public.entidades
  ADD COLUMN apelido varchar,
  ADD COLUMN cnae varchar,
  ADD COLUMN site varchar,
  ADD COLUMN forma_atuacao varchar,
  ADD COLUMN atividade_principal varchar,
  ADD COLUMN setor_id uuid REFERENCES public.setores_empresa(id),
  ADD COLUMN contato_empresa jsonb,
  ADD COLUMN contatos jsonb,
  ADD COLUMN documentos jsonb,
  ADD COLUMN dados_pessoais jsonb,
  ADD COLUMN qualificacao_fiscal jsonb;
