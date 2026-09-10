-- PROD-1: registra as novas tabelas (fichas_tecnicas, fichas_tecnicas_itens,
-- ordens_fabricacao, ordens_fabricacao_consumos) em entidade_dependencias, a tabela de
-- metadados (gerada por introspecção de FK real, não hard-coded) que a UI consulta via
-- check_dependencias() antes de deixar excluir produtos/fichas técnicas/localizações.
--
-- Achado ao vivo: sem isso, o diálogo de exclusão de "Produtos" dizia "Nenhum vínculo
-- encontrado" para um produto que já era insumo/produto acabado de ficha técnica e tinha
-- movimentações geradas por ordem de fabricação — a introspecção original (migration
-- 20260713213203) rodou uma vez só, antes destas tabelas existirem, e nunca foi
-- regenerada.
--
-- Achado adicional, registrado mas fora de escopo corrigir agora (não é do módulo de
-- Produção): tanto o seed original (20260713213203) quanto a função
-- public.regenerar_entidade_dependencias() usam `conrelid::regclass::text` e fazem
-- split_part(...,'.',2) para extrair nome de tabela — isso só funciona quando o schema
-- aparece qualificado no texto, o que NÃO acontece quando 'public' está no search_path da
-- sessão (comportamento padrão do Postgres, e também o `SET search_path = public` da
-- própria função). Nessas condições split_part retorna string vazia e a linha nunca é
-- gerada — ou seja, é provável que NENHUMA tabela criada por migration desde 2026-07-13
-- tenha sido de fato registrada em entidade_dependencias como dependência, silenciosamente,
-- mesmo cada vez que alguém rodou regenerar_entidade_dependencias() manualmente. Ver
-- docs/STATUS.md.
--
-- Esta migration usa pg_class.relname diretamente (não regclass::text), robusto
-- independente do search_path.

INSERT INTO public.entidade_dependencias(
  entidade_pai, tabela_filha, coluna_fk, label,
  bloqueia_exclusao, soft_delete_col, on_delete, ativo
)
SELECT
  pc_pai.relname AS entidade_pai,
  pc_filha.relname AS tabela_filha,
  (SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]) AS coluna_fk,
  initcap(replace(pc_filha.relname,'_',' ')) AS label,
  (c.confdeltype IN ('a','r')) AS bloqueia_exclusao,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns ic
     WHERE ic.table_schema='public'
       AND ic.table_name = pc_filha.relname
       AND ic.column_name='deleted_at'
  ) THEN 'deleted_at' END AS soft_delete_col,
  CASE c.confdeltype
    WHEN 'a' THEN 'NO_ACTION' WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'   WHEN 'n' THEN 'SET_NULL'
    WHEN 'd' THEN 'SET_DEFAULT' END AS on_delete,
  true
FROM pg_constraint c
JOIN pg_class pc_filha ON pc_filha.oid = c.conrelid
JOIN pg_class pc_pai ON pc_pai.oid = c.confrelid
WHERE c.contype='f'
  AND c.connamespace='public'::regnamespace
  AND pc_filha.relnamespace = 'public'::regnamespace
  AND pc_pai.relnamespace = 'public'::regnamespace
  AND pc_filha.relname IN (
    'fichas_tecnicas', 'fichas_tecnicas_itens', 'ordens_fabricacao', 'ordens_fabricacao_consumos'
  )
ON CONFLICT (entidade_pai, tabela_filha, coluna_fk) DO NOTHING;
