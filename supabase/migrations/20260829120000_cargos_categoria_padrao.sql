-- Cargo do ERP -> role sugerida no satélite (retomada de
-- C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md, passo 1). Nullable, sem
-- migração de dado -- RH real escolhe a categoria, não adivinha a partir do nome do
-- cargo. Taxonomia genérica de propósito, não usa vocabulário de role do educacional
-- (mesmo princípio de feedback_satellite_generic_contracts): qualquer satélite futuro
-- (PDV, frente de caixa, CRM) reusa este mesmo campo.
ALTER TABLE public.cargos
  ADD COLUMN categoria_padrao text NULL
  CHECK (categoria_padrao IN (
    'pedagogico', 'coordenacao_administrativa', 'administrativo',
    'financeiro', 'diretoria', 'outro'
  ));
