ALTER TABLE public.usuarios ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_user_id_unique ON public.usuarios(user_id) WHERE user_id IS NOT NULL;