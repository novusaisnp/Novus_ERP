DO $$
DECLARE
  v_user_id uuid;
  v_empresa_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email='e2e@novus.test' LIMIT 1;
  SELECT id INTO v_empresa_id FROM public.empresas_representadas WHERE nome='E2E TEST CO' LIMIT 1;
  IF v_user_id IS NULL OR v_empresa_id IS NULL THEN
    RAISE NOTICE 'E2E user/empresa not found; skip role bind.';
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=v_user_id AND empresa_representada_id=v_empresa_id
  ) THEN
    INSERT INTO public.user_roles (user_id, empresa_representada_id, role)
    VALUES (v_user_id, v_empresa_id, 'admin');
  END IF;
END $$;