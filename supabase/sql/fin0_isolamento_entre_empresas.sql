-- FIN-0 — prova de isolamento entre empresas nos caminhos financeiros.
--
-- Critério de saída da fase: nenhum usuário opera fora do seu escopo. Este script cria duas
-- empresas com um usuário cada, sem papel que atravesse empresas, e verifica leitura e
-- escrita em cada caminho financeiro relevante.
--
-- Como executar (o BEGIN/ROLLBACK é obrigatório: o script cria dados reais):
--   { echo "BEGIN;"; cat supabase/sql/fin0_isolamento_entre_empresas.sql; echo "ROLLBACK;"; } \
--     | supabase db query --linked --file /dev/stdin
--
-- Falha em qualquer cenário levanta exceção e aborta a transação.

DO $$
DECLARE
  v_empresa_a uuid;
  v_empresa_b uuid;
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_perfil uuid;
  v_titulo_a uuid;
  v_titulo_b uuid;
  v_visiveis integer;
  v_erro text;
BEGIN
  -- ----------------------------------------------------------------- cenário
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[ISO] Empresa A', '11111111000191') RETURNING id INTO v_empresa_a;
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[ISO] Empresa B', '22222222000191') RETURNING id INTO v_empresa_b;

  INSERT INTO auth.users (id) VALUES (v_user_a), (v_user_b);

  -- Perfil com permissões financeiras amplas: o que separa os dois é a empresa, não o perfil.
  INSERT INTO perfis_acesso (codigo, nome, permissoes, sistema)
  VALUES ('[ISO] OPERADOR', '[ISO] Operador',
          '["financeiro.create","financeiro.read","financeiro.update","financeiro.delete",
            "financeiro.estorno","financeiro.liquidar","financeiro.cancelamento"]'::jsonb,
          false)
  RETURNING id INTO v_perfil;

  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, perfil_id, ativo)
  VALUES (v_user_a, '[ISO] Usuario A', 'iso-a@exemplo.invalido', v_empresa_a, v_perfil, true),
         (v_user_b, '[ISO] Usuario B', 'iso-b@exemplo.invalido', v_empresa_b, v_perfil, true);

  -- Papel restrito à própria empresa. Nenhum dos dois é admin nem novus_owner, justamente
  -- porque esses papéis atravessam empresas por desenho.
  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_user_a, 'operador', v_empresa_a),
         (v_user_b, 'operador', v_empresa_b);

  INSERT INTO contas_receber (empresa_representada_id, descricao, valor_original, data_vencimento, status)
  VALUES (v_empresa_a, '[ISO] titulo da empresa A', 100, current_date, 'PENDENTE')
  RETURNING id INTO v_titulo_a;
  INSERT INTO contas_receber (empresa_representada_id, descricao, valor_original, data_vencimento, status)
  VALUES (v_empresa_b, '[ISO] titulo da empresa B', 200, current_date, 'PENDENTE')
  RETURNING id INTO v_titulo_b;

  -- --------------------------------------------------------------- leitura
  -- A RLS é avaliada para o papel `authenticated`, não para o dono da conexão.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user_a)::text, true);

  SELECT count(*) INTO v_visiveis FROM contas_receber WHERE descricao LIKE '[ISO]%';
  ASSERT v_visiveis = 1, 'L1: usuario A deveria ver 1 titulo, viu ' || v_visiveis;

  SELECT count(*) INTO v_visiveis FROM contas_receber WHERE id = v_titulo_b;
  ASSERT v_visiveis = 0, 'L2: usuario A NAO deveria enxergar o titulo da empresa B';
  RAISE NOTICE 'ok leitura: cada usuario ve somente o titulo da propria empresa';

  -- --------------------------------------------------------------- escrita
  -- Editar título da outra empresa pela RPC transacional.
  BEGIN
    PERFORM financeiro_salvar_titulo(
      'CONTAS_RECEBER', jsonb_build_object('descricao', '[ISO] invadido'),
      '[]'::jsonb, v_titulo_b, v_empresa_a);
    RAISE EXCEPTION 'E1: edicao de titulo de outra empresa deveria ter sido recusada';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    ASSERT v_erro NOT LIKE 'E1:%', v_erro;
    RAISE NOTICE 'ok escrita: edicao cruzada recusada (%)', v_erro;
  END;

  -- Informar a empresa da vítima também não deve funcionar: o usuário não opera nela.
  BEGIN
    PERFORM financeiro_salvar_titulo(
      'CONTAS_RECEBER', jsonb_build_object('descricao', '[ISO] invadido'),
      '[]'::jsonb, v_titulo_b, v_empresa_b);
    RAISE EXCEPTION 'E2: edicao com empresa forjada deveria ter sido recusada';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    ASSERT v_erro NOT LIKE 'E2:%', v_erro;
    RAISE NOTICE 'ok escrita: empresa forjada no payload recusada (%)', v_erro;
  END;

  -- Liquidar título da outra empresa.
  BEGIN
    PERFORM financeiro_liquidar_titulo(
      v_titulo_b, 'CONTAS_RECEBER', 10, current_date, 'DINHEIRO', gen_random_uuid());
    RAISE EXCEPTION 'E3: liquidacao de titulo de outra empresa deveria ter sido recusada';
  EXCEPTION WHEN insufficient_privilege OR raise_exception OR no_data_found OR invalid_authorization_specification THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    ASSERT v_erro NOT LIKE 'E3:%', v_erro;
    RAISE NOTICE 'ok escrita: liquidacao cruzada recusada (%)', v_erro;
  END;

  -- Cancelar título da outra empresa (sem ticket já barra, mas o alvo aqui é o tenant).
  BEGIN
    PERFORM financeiro_cancelar_titulo(
      v_titulo_b, 'CONTAS_RECEBER', 'tentativa de invasao', gen_random_uuid());
    RAISE EXCEPTION 'E4: cancelamento de titulo de outra empresa deveria ter sido recusado';
  EXCEPTION WHEN insufficient_privilege OR raise_exception OR no_data_found OR invalid_authorization_specification THEN
    GET STACKED DIAGNOSTICS v_erro = MESSAGE_TEXT;
    ASSERT v_erro NOT LIKE 'E4:%', v_erro;
    RAISE NOTICE 'ok escrita: cancelamento cruzado recusado (%)', v_erro;
  END;

  -- Escrita direta na tabela, sem passar por RPC: a RLS precisa barrar sozinha.
  UPDATE contas_receber SET descricao = '[ISO] invadido' WHERE id = v_titulo_b;
  SELECT count(*) INTO v_visiveis FROM contas_receber
   WHERE id = v_titulo_b AND descricao = '[ISO] invadido';
  ASSERT v_visiveis = 0, 'E5: UPDATE direto atravessou a RLS';
  RAISE NOTICE 'ok escrita: UPDATE direto na tabela nao alcanca a outra empresa';

  -- ------------------------------------------- o caminho proprio segue funcionando
  PERFORM financeiro_salvar_titulo(
    'CONTAS_RECEBER', jsonb_build_object('descricao', '[ISO] editado pelo dono'),
    '[]'::jsonb, v_titulo_a, v_empresa_a);
  RAISE NOTICE 'ok: o dono continua editando o proprio titulo';

  RESET ROLE;

  -- Confirma, já sem RLS, que o título da empresa B ficou intacto.
  SELECT count(*) INTO v_visiveis FROM contas_receber
   WHERE id = v_titulo_b AND descricao = '[ISO] titulo da empresa B';
  ASSERT v_visiveis = 1, 'F1: o titulo da empresa B foi alterado em algum caminho';

  RAISE NOTICE 'ISOLAMENTO ENTRE EMPRESAS: TODOS OS CENARIOS PASSARAM';
END $$;
