CREATE TABLE IF NOT EXISTS public.entidade_dependencias (
  entidade_pai      text NOT NULL,
  tabela_filha      text NOT NULL,
  coluna_fk         text NOT NULL,
  label             text NOT NULL,
  bloqueia_exclusao boolean NOT NULL DEFAULT true,
  soft_delete_col   text,
  on_delete         text NOT NULL DEFAULT 'NO_ACTION',
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidade_pai, tabela_filha, coluna_fk)
);

GRANT SELECT ON public.entidade_dependencias TO authenticated;
GRANT ALL ON public.entidade_dependencias TO service_role;

ALTER TABLE public.entidade_dependencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY entidade_dependencias_select
  ON public.entidade_dependencias FOR SELECT
  TO authenticated USING (true);

CREATE POLICY entidade_dependencias_admin_write
  ON public.entidade_dependencias FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_entidade_dependencias_updated
  BEFORE UPDATE ON public.entidade_dependencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bootstrap: popula direto sem guard (executado pela role de migration)
INSERT INTO public.entidade_dependencias(
  entidade_pai, tabela_filha, coluna_fk, label,
  bloqueia_exclusao, soft_delete_col, on_delete, ativo
)
SELECT
  split_part(confrelid::regclass::text,'.',2) AS entidade_pai,
  split_part(conrelid::regclass::text,'.',2)  AS tabela_filha,
  (SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]) AS coluna_fk,
  initcap(replace(split_part(conrelid::regclass::text,'.',2),'_',' ')) AS label,
  (c.confdeltype IN ('a','r')) AS bloqueia_exclusao,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns ic
     WHERE ic.table_schema='public'
       AND ic.table_name = split_part(conrelid::regclass::text,'.',2)
       AND ic.column_name='deleted_at'
  ) THEN 'deleted_at' END AS soft_delete_col,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO_ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET_NULL'
    WHEN 'd' THEN 'SET_DEFAULT' END AS on_delete,
  true
FROM pg_constraint c
WHERE c.contype='f'
  AND c.connamespace='public'::regnamespace
  AND (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid) = 'public'::regnamespace
ON CONFLICT (entidade_pai, tabela_filha, coluna_fk) DO NOTHING;

-- Função para regenerar em runtime (admin-only)
CREATE OR REPLACE FUNCTION public.regenerar_entidade_dependencias()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.entidade_dependencias(
    entidade_pai, tabela_filha, coluna_fk, label,
    bloqueia_exclusao, soft_delete_col, on_delete, ativo
  )
  SELECT
    split_part(confrelid::regclass::text,'.',2),
    split_part(conrelid::regclass::text,'.',2),
    (SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]),
    initcap(replace(split_part(conrelid::regclass::text,'.',2),'_',' ')),
    (c.confdeltype IN ('a','r')),
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns ic
       WHERE ic.table_schema='public'
         AND ic.table_name = split_part(conrelid::regclass::text,'.',2)
         AND ic.column_name='deleted_at'
    ) THEN 'deleted_at' END,
    CASE c.confdeltype
      WHEN 'a' THEN 'NO_ACTION' WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET_NULL'
      WHEN 'd' THEN 'SET_DEFAULT' END,
    true
  FROM pg_constraint c
  WHERE c.contype='f'
    AND c.connamespace='public'::regnamespace
    AND (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid) = 'public'::regnamespace
  ON CONFLICT (entidade_pai, tabela_filha, coluna_fk) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerar_entidade_dependencias() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerar_entidade_dependencias() TO authenticated;

-- Consulta usada pela UI
CREATE OR REPLACE FUNCTION public.check_dependencias(p_entidade text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record; v_count bigint; v_sql text;
  v_deps jsonb := '[]'::jsonb;
  v_total bigint := 0; v_bloq bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.entidade_dependencias
     WHERE entidade_pai = p_entidade AND ativo = true
  ) THEN
    RETURN jsonb_build_object(
      'entidade', p_entidade, 'id', p_id,
      'pode_excluir', true, 'total_dependentes', 0, 'total_bloqueantes', 0,
      'dependencias', '[]'::jsonb,
      'aviso', 'entidade sem dependencias parametrizadas'
    );
  END IF;

  FOR r IN
    SELECT tabela_filha, coluna_fk, label, bloqueia_exclusao, soft_delete_col, on_delete
      FROM public.entidade_dependencias
     WHERE entidade_pai = p_entidade AND ativo = true
     ORDER BY bloqueia_exclusao DESC, tabela_filha
  LOOP
    v_sql := format(
      'SELECT count(*) FROM public.%I WHERE %I = $1 %s',
      r.tabela_filha, r.coluna_fk,
      CASE WHEN r.soft_delete_col IS NOT NULL
           THEN format('AND %I IS NULL', r.soft_delete_col) ELSE '' END
    );
    EXECUTE v_sql INTO v_count USING p_id;

    IF v_count > 0 THEN
      v_total := v_total + v_count;
      IF r.bloqueia_exclusao THEN v_bloq := v_bloq + v_count; END IF;
      v_deps := v_deps || jsonb_build_object(
        'tabela', r.tabela_filha,
        'label',  r.label,
        'count',  v_count,
        'bloqueia', r.bloqueia_exclusao,
        'on_delete', r.on_delete
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'entidade', p_entidade,
    'id', p_id,
    'pode_excluir', (v_bloq = 0),
    'total_dependentes', v_total,
    'total_bloqueantes', v_bloq,
    'dependencias', v_deps
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_dependencias(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_dependencias(text, uuid) TO authenticated;