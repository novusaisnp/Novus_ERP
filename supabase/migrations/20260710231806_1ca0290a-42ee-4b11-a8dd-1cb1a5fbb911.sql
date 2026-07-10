
-- 1) Tabela de Perfis de Acesso
CREATE TABLE IF NOT EXISTS public.perfis_acesso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(120) NOT NULL,
  codigo varchar(60) NOT NULL UNIQUE,
  descricao text,
  permissoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  sistema boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) GRANTs
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis_acesso TO authenticated;
GRANT ALL ON public.perfis_acesso TO service_role;

-- 3) RLS
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read perfis_acesso"
  ON public.perfis_acesso FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert perfis_acesso"
  ON public.perfis_acesso FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update non-system perfis_acesso"
  ON public.perfis_acesso FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete non-system perfis_acesso"
  ON public.perfis_acesso FOR DELETE TO authenticated
  USING (sistema = false);

-- 4) Trigger updated_at
DROP TRIGGER IF EXISTS trg_perfis_acesso_updated_at ON public.perfis_acesso;
CREATE TRIGGER trg_perfis_acesso_updated_at
  BEFORE UPDATE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Trigger que bloqueia UPDATE em perfis do sistema (exceto no próprio campo sistema/ativo)
CREATE OR REPLACE FUNCTION public.protect_perfis_sistema()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sistema = true THEN
    -- permite apenas alternar ativo; demais campos ficam bloqueados
    IF NEW.nome IS DISTINCT FROM OLD.nome
       OR NEW.codigo IS DISTINCT FROM OLD.codigo
       OR NEW.descricao IS DISTINCT FROM OLD.descricao
       OR NEW.permissoes IS DISTINCT FROM OLD.permissoes
       OR NEW.sistema IS DISTINCT FROM OLD.sistema THEN
      RAISE EXCEPTION 'Perfis do sistema não podem ser modificados';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_perfis_sistema ON public.perfis_acesso;
CREATE TRIGGER trg_protect_perfis_sistema
  BEFORE UPDATE ON public.perfis_acesso
  FOR EACH ROW EXECUTE FUNCTION public.protect_perfis_sistema();

-- 6) FK de usuarios.perfil_id -> perfis_acesso.id (SET NULL se o perfil for removido)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_perfil_id_fkey'
  ) THEN
    ALTER TABLE public.usuarios
      ADD CONSTRAINT usuarios_perfil_id_fkey
      FOREIGN KEY (perfil_id) REFERENCES public.perfis_acesso(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_id ON public.usuarios(perfil_id);

-- 7) Seed dos 3 perfis-sistema (idempotente via ON CONFLICT)
INSERT INTO public.perfis_acesso (nome, codigo, descricao, permissoes, ativo, sistema) VALUES
  ('Administrador', 'ADMINISTRADOR',
    'Acesso total ao sistema, incluindo configurações críticas.',
    '["vendas.create","vendas.read","vendas.update","vendas.delete","vendas.desconto","vendas.cancelamento","vendas.alterarPreco","compras.create","compras.read","compras.update","compras.delete","compras.aprovacao","estoque.create","estoque.read","estoque.update","estoque.delete","estoque.ajuste","estoque.transferencia","estoque.inventario","produtos.create","produtos.read","produtos.update","produtos.delete","produtos.precos","clientes.create","clientes.read","clientes.update","clientes.delete","fornecedores.create","fornecedores.read","fornecedores.update","fornecedores.delete","financeiro.create","financeiro.read","financeiro.update","financeiro.delete","financeiro.estorno","financeiro.lancamentoRetroativo","financeiro.alterarVencimento","fiscal.create","fiscal.read","fiscal.update","fiscal.delete","fiscal.cancelarNfe","fiscal.cartaCorrecao","fiscal.inutilizacao","nfe.create","nfe.read","nfe.update","nfe.cancel","rh.create","rh.read","rh.update","rh.delete","rh.folhaPagamento","rh.ponto","rh.admissao","rh.demissao","relatorios.vendas","relatorios.compras","relatorios.financeiro","relatorios.fiscal","relatorios.gerencial","relatorios.operacional","relatorios.export","caixa.abrir","caixa.fechar","caixa.sangria","caixa.suprimento","config.empresas","config.usuarios","config.sistema"]'::jsonb,
    true, true),
  ('Operador', 'OPERADOR',
    'Perfil operacional padrão: cria e edita registros nos módulos do dia a dia, sem acesso a ações críticas.',
    '["vendas.create","vendas.read","vendas.update","vendas.desconto","vendas.alterarPreco","compras.create","compras.read","compras.update","estoque.create","estoque.read","estoque.update","estoque.transferencia","produtos.create","produtos.read","produtos.update","clientes.create","clientes.read","clientes.update","fornecedores.create","fornecedores.read","fornecedores.update","financeiro.create","financeiro.read","financeiro.update","financeiro.alterarVencimento","fiscal.create","fiscal.read","fiscal.update","fiscal.cartaCorrecao","nfe.create","nfe.read","nfe.update","rh.read","rh.ponto","relatorios.vendas","relatorios.compras","relatorios.financeiro","relatorios.operacional","relatorios.export","caixa.abrir","caixa.fechar","caixa.suprimento"]'::jsonb,
    true, true),
  ('Consulta', 'CONSULTA',
    'Perfil somente leitura: visualiza dados de todos os módulos sem poder alterar.',
    '["vendas.read","compras.read","estoque.read","produtos.read","clientes.read","fornecedores.read","financeiro.read","fiscal.read","nfe.read","rh.read","relatorios.vendas","relatorios.compras","relatorios.financeiro","relatorios.fiscal","relatorios.gerencial","relatorios.operacional","relatorios.export"]'::jsonb,
    true, true)
ON CONFLICT (codigo) DO NOTHING;
