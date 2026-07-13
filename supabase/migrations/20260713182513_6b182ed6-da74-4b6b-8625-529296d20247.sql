-- P16.2 — Seed idempotente do tenant E2E TEST CO
-- Cria apenas a empresa. O usuário auth `e2e@novus.test` deve ser criado
-- fora da migration (via Auth admin API ou UI) e seu role é atribuído
-- posteriormente por script operacional. A migration NÃO toca em auth.users.

INSERT INTO public.empresas_representadas (nome, cnpj, email, ativo)
SELECT 'E2E TEST CO', '00000000000191', 'e2e@novus.test', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.empresas_representadas WHERE nome = 'E2E TEST CO'
);

-- Vincula automaticamente o role admin ao usuário e2e caso ele já exista.
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'e2e@novus.test' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT v_user_id, 'admin'::public.app_role
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = v_user_id AND role = 'admin'::public.app_role
    );
  END IF;
END $$;