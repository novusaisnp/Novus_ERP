DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.usuarios'::regclass
      AND conname = 'usuarios_perfil_id_fkey'
  ) THEN
    ALTER TABLE public.usuarios
      DROP CONSTRAINT usuarios_perfil_id_fkey;
  END IF;

  ALTER TABLE public.usuarios
    ADD CONSTRAINT usuarios_perfil_id_fkey
    FOREIGN KEY (perfil_id)
    REFERENCES public.perfis_acesso(id)
    ON DELETE SET NULL;
END $$;