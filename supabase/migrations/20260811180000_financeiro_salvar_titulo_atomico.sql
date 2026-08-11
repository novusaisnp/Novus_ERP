-- Grava titulo e rateios na mesma transacao (FIN-0, lacuna L2).
--
-- Antes, criar fazia insert do titulo e depois insert dos rateios, compensando com um
-- delete manual em caso de falha -- compensacao de aplicacao, nao transacao. Editar era
-- pior: apagava os rateios e reinseria sem nenhuma compensacao, de modo que uma falha na
-- reinsercao deixava o titulo com zero rateios, em silencio. Pagar e receber repetiam o
-- mesmo padrao.
--
-- Aqui titulo e rateios vivem ou morrem juntos.

DROP FUNCTION IF EXISTS public.financeiro_salvar_titulo(text, jsonb, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.financeiro_salvar_titulo(
  p_tipo_titulo text,
  p_dados jsonb,
  p_rateios jsonb DEFAULT '[]'::jsonb,
  p_titulo_id uuid DEFAULT NULL,
  p_empresa_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_empresa_id uuid;
  v_tabela text;
  v_tabela_rateio text;
  v_coluna_vinculo text;
  v_titulo_id uuid := p_titulo_id;
  v_empresa_do_titulo uuid;
  v_dados jsonb;
  v_sets text;
  v_rateio jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_tipo_titulo NOT IN ('CONTAS_PAGAR', 'CONTAS_RECEBER') THEN
    RAISE EXCEPTION 'Tipo de titulo invalido';
  END IF;

  PERFORM financeiro_exigir_permissao(
    CASE WHEN p_titulo_id IS NULL THEN 'financeiro.create' ELSE 'financeiro.update' END);

  IF p_tipo_titulo = 'CONTAS_PAGAR' THEN
    v_tabela := 'contas_pagar';
    v_tabela_rateio := 'rateios_contas_pagar';
    v_coluna_vinculo := 'conta_pagar_id';
  ELSE
    v_tabela := 'contas_receber';
    v_tabela_rateio := 'rateios_contas_receber';
    v_coluna_vinculo := 'conta_receber_id';
  END IF;

  -- Empresa da operacao. `get_user_empresa_id()` le o vinculo em user_roles e e NULL para
  -- quem opera acima de uma empresa; nesse caso vale a empresa ativa informada pela
  -- aplicacao, desde que o usuario possa mesmo operar nela.
  v_empresa_id := get_user_empresa_id();

  IF p_empresa_id IS NOT NULL AND p_empresa_id IS DISTINCT FROM v_empresa_id THEN
    IF v_empresa_id IS NULL
       OR has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'novus_owner'::app_role) THEN
      v_empresa_id := p_empresa_id;
    ELSE
      RAISE EXCEPTION 'Sem acesso a empresa informada' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- A empresa vem sempre do servidor. Se o payload trouxer uma, ela e ignorada -- o cliente
  -- nao escolhe em nome de quem grava.
  v_dados := (p_dados - 'empresa_representada_id' - 'id' - 'created_at' - 'deleted_at');

  IF v_titulo_id IS NULL THEN
    -- ------------------------------------------------------------------ criar
    IF v_empresa_id IS NULL THEN
      RAISE EXCEPTION 'Empresa do usuario nao identificada';
    END IF;

    v_dados := v_dados || jsonb_build_object('empresa_representada_id', v_empresa_id);

    -- Somente as colunas presentes no payload entram no INSERT; as demais ficam com o
    -- default da tabela. Inserir a linha inteira anularia id, created_at e afins.
    SELECT string_agg(quote_ident(c.column_name), ', ')
      INTO v_sets
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = v_tabela
       AND v_dados ? c.column_name;

    EXECUTE format(
      'INSERT INTO %I (%s) SELECT %s FROM jsonb_populate_record(NULL::%I, $1) RETURNING id',
      v_tabela, v_sets, v_sets, v_tabela)
      USING v_dados
      INTO v_titulo_id;

    v_empresa_do_titulo := v_empresa_id;
  ELSE
    -- ----------------------------------------------------------------- editar
    EXECUTE format('SELECT empresa_representada_id FROM %I WHERE id = $1 FOR UPDATE', v_tabela)
      USING v_titulo_id INTO v_empresa_do_titulo;

    IF v_empresa_do_titulo IS NULL THEN
      RAISE EXCEPTION 'Titulo nao encontrado';
    END IF;

    -- Isolamento entre empresas: papeis que a RLS libera alem da empresa ativa nao podem
    -- editar titulo de outra empresa por id.
    IF v_empresa_id IS NOT NULL AND v_empresa_do_titulo <> v_empresa_id THEN
      RAISE EXCEPTION 'Titulo pertence a outra empresa' USING ERRCODE = '42501';
    END IF;

    -- Monta o SET somente com chaves que sao colunas reais da tabela. A lista sai do
    -- catalogo, entao nome de coluna inventado no payload e descartado em vez de virar SQL.
    SELECT string_agg(format('%I = n.%I', c.column_name, c.column_name), ', ')
      INTO v_sets
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name = v_tabela
       AND v_dados ? c.column_name;

    IF v_sets IS NOT NULL THEN
      -- `jsonb_populate_record` faz a conversao para o tipo real de cada coluna; extrair o
      -- valor como texto obrigaria a um cast por coluna.
      EXECUTE format(
        'UPDATE %I SET %s FROM jsonb_populate_record(NULL::%I, $1) n WHERE %I.id = $2',
        v_tabela, v_sets, v_tabela, v_tabela)
        USING v_dados, v_titulo_id;
    END IF;

    EXECUTE format('DELETE FROM %I WHERE %I = $1', v_tabela_rateio, v_coluna_vinculo)
      USING v_titulo_id;
  END IF;

  -- ------------------------------------------------------------------- rateios
  IF jsonb_typeof(p_rateios) = 'array' THEN
    FOR v_rateio IN SELECT * FROM jsonb_array_elements(p_rateios) LOOP
      EXECUTE format(
        'INSERT INTO %I (empresa_representada_id, %I, plano_conta_id, centro_custo_id,
                         valor, percentual, observacoes)
         VALUES ($1, $2, ($3->>''plano_conta_id'')::uuid, ($3->>''centro_custo_id'')::uuid,
                 ($3->>''valor'')::numeric, ($3->>''percentual'')::numeric,
                 $3->>''observacoes'')',
        v_tabela_rateio, v_coluna_vinculo)
        USING v_empresa_do_titulo, v_titulo_id, v_rateio;
    END LOOP;
  END IF;

  RETURN v_titulo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.financeiro_salvar_titulo(text, jsonb, jsonb, uuid, uuid) TO authenticated;
