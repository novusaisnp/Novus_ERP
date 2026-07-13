-- Limpa registros com nomes vazios
DELETE FROM public.entidade_dependencias
 WHERE entidade_pai = '' OR tabela_filha = '' OR coluna_fk = '';

-- Repopula com lógica correta usando pg_class direto
INSERT INTO public.entidade_dependencias(
  entidade_pai, tabela_filha, coluna_fk, label,
  bloqueia_exclusao, soft_delete_col, on_delete, ativo
)
SELECT
  cp.relname AS entidade_pai,
  cf.relname AS tabela_filha,
  (SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]) AS coluna_fk,
  initcap(replace(cf.relname,'_',' ')) AS label,
  (c.confdeltype IN ('a','r')) AS bloqueia_exclusao,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns ic
     WHERE ic.table_schema='public' AND ic.table_name = cf.relname
       AND ic.column_name='deleted_at'
  ) THEN 'deleted_at' END AS soft_delete_col,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO_ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET_NULL'
    WHEN 'd' THEN 'SET_DEFAULT' END,
  true
FROM pg_constraint c
JOIN pg_class cf ON cf.oid = c.conrelid
JOIN pg_class cp ON cp.oid = c.confrelid
WHERE c.contype='f'
  AND c.connamespace = 'public'::regnamespace
  AND cp.relnamespace = 'public'::regnamespace
ON CONFLICT (entidade_pai, tabela_filha, coluna_fk) DO NOTHING;

-- Atualiza função runtime para usar o mesmo padrão
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
    cp.relname, cf.relname,
    (SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]),
    initcap(replace(cf.relname,'_',' ')),
    (c.confdeltype IN ('a','r')),
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns ic
       WHERE ic.table_schema='public' AND ic.table_name = cf.relname
         AND ic.column_name='deleted_at'
    ) THEN 'deleted_at' END,
    CASE c.confdeltype
      WHEN 'a' THEN 'NO_ACTION' WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET_NULL'
      WHEN 'd' THEN 'SET_DEFAULT' END,
    true
  FROM pg_constraint c
  JOIN pg_class cf ON cf.oid = c.conrelid
  JOIN pg_class cp ON cp.oid = c.confrelid
  WHERE c.contype='f'
    AND c.connamespace = 'public'::regnamespace
    AND cp.relnamespace = 'public'::regnamespace
  ON CONFLICT (entidade_pai, tabela_filha, coluna_fk) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;