-- AUDITORIA_NOVA.md — Fase 1, verificação: prova de que a conciliação bancária
-- deixou de estar inoperante para um usuário `authenticated` real, depois de
-- 20260816120000_fase1_conciliacao_policies.sql.
--
-- Mesmo padrão de supabase/sql/fin0_isolamento_entre_empresas.sql: cria dados
-- de teste, troca para o papel `authenticated` (a RLS é avaliada para esse
-- papel, não para o dono da conexão), prova o caminho ponta a ponta, e tudo
-- roda dentro de BEGIN...ROLLBACK — nada fica gravado.
--
-- Como executar:
--   { echo "BEGIN;"; cat supabase/sql/fase1_conciliacao_prova_ao_vivo.sql; echo "ROLLBACK;"; } \
--     | supabase db query --linked --file /dev/stdin

DO $$
DECLARE
  v_empresa   uuid;
  v_user      uuid := gen_random_uuid();
  v_conta     uuid;
  v_extrato   uuid;
  v_mov       uuid;
  v_regra     uuid;
  v_count     integer;
  v_erro      text;
BEGIN
  INSERT INTO empresas_representadas (nome, cnpj)
  VALUES ('[FASE1-TEST] Empresa Conciliacao', '33333333000191') RETURNING id INTO v_empresa;

  INSERT INTO auth.users (id) VALUES (v_user);

  INSERT INTO usuarios (user_id, nome, email, empresa_representada_id, ativo)
  VALUES (v_user, '[FASE1-TEST] Usuario', 'fase1-test@exemplo.invalido', v_empresa, true);

  INSERT INTO user_roles (user_id, role, empresa_representada_id)
  VALUES (v_user, 'operador', v_empresa);

  INSERT INTO contas_bancarias (empresa_representada_id, numero_conta, tipo_conta, ativo, conta_cofre)
  VALUES (v_empresa, '123456', 'CORRENTE', true, true)
  RETURNING id INTO v_conta;

  -- --------------------------------------------------------------- papel real
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user)::text, true);

  -- Antes da migration: SELECT vazio sem erro (sintoma enganoso descrito na
  -- auditoria) e qualquer INSERT falhava com 42501. Prova o ciclo completo.
  INSERT INTO banco_extratos_importados
    (empresa_representada_id, conta_bancaria_id, nome_arquivo, hash_arquivo, formato, status)
  VALUES (v_empresa, v_conta, 'extrato-teste.ofx', 'hash-fase1-teste', 'OFX', 'IMPORTADO')
  RETURNING id INTO v_extrato;

  INSERT INTO banco_movimentacoes_extrato
    (empresa_representada_id, extrato_importado_id, conta_bancaria_id, data_movimento, valor, descricao, tipo)
  VALUES (v_empresa, v_extrato, v_conta, current_date, 150.00, '[FASE1-TEST] lancamento', 'CREDITO')
  RETURNING id INTO v_mov;

  INSERT INTO banco_regras_conciliacao (empresa_representada_id, nome, tipo, padrao)
  VALUES (v_empresa, '[FASE1-TEST] regra', 'PALAVRA_CHAVE', 'teste')
  RETURNING id INTO v_regra;

  INSERT INTO banco_conciliacao_log (empresa_representada_id, movimentacao_extrato_id, acao, usuario_id)
  VALUES (v_empresa, v_mov, 'IMPORTADO', v_user);

  SELECT count(*) INTO v_count FROM banco_extratos_importados WHERE id = v_extrato;
  ASSERT v_count = 1, 'extrato importado deveria ser visivel para o proprio usuario, viu ' || v_count;

  SELECT count(*) INTO v_count FROM banco_movimentacoes_extrato WHERE id = v_mov;
  ASSERT v_count = 1, 'movimentacao de extrato deveria ser visivel, viu ' || v_count;

  SELECT count(*) INTO v_count FROM banco_regras_conciliacao WHERE id = v_regra;
  ASSERT v_count = 1, 'regra de conciliacao deveria ser visivel, viu ' || v_count;

  SELECT count(*) INTO v_count FROM banco_conciliacao_log WHERE movimentacao_extrato_id = v_mov;
  ASSERT v_count = 1, 'log de conciliacao deveria ser visivel, viu ' || v_count;

  UPDATE banco_movimentacoes_extrato SET status_conciliacao = 'CONCILIADO' WHERE id = v_mov;
  SELECT status_conciliacao::text INTO v_erro FROM banco_movimentacoes_extrato WHERE id = v_mov;
  ASSERT v_erro = 'CONCILIADO', 'update deveria ter passado e persistido CONCILIADO, ficou ' || v_erro;

  RAISE NOTICE 'ok: usuario authenticated real le e escreve nas 4 tabelas de conciliacao (antes: SELECT vazio, INSERT 42501)';
END $$;
