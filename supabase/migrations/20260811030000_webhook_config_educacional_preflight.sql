-- Porta 3 (colaborador-preflight) nunca funcionou de verdade: a checagem
-- síncrona que o Educacional faz antes de criar um membro de equipe
-- (checkColaboradorValidado -> colaborador-preflight) depende de uma linha
-- em webhook_configs (nome='novus-educacional' + empresa) pra achar o
-- secret_token e validar a assinatura HMAC -- essa linha nunca existiu,
-- então toda chamada sempre voltava 401 "unauthorized" (fail-closed).
-- Descoberto ao vivo testando o fluxo de senha temporária desta sessão,
-- não relacionado ao fix em si, mas bloqueava o teste end-to-end.
--
-- secret_token é o MESMO já salvo em erp_integration_config.signing_secret
-- do lado Educacional -- os dois precisam bater (shared secret).
-- Sem unique constraint em (nome, empresa_representada_id) -- guarda com
-- NOT EXISTS em vez de ON CONFLICT (não há índice pra ancorar o conflito).
INSERT INTO public.webhook_configs (empresa_representada_id, nome, url_destino, secret_token, ativo, descricao)
SELECT
  '47bc75bc-0fba-4328-ab76-d5e880546e23',
  'novus-educacional',
  'https://ixnpotaccbpcbritxlud.supabase.co/functions/v1/create-staff-user',
  'cf4f4b4cdf0b711189fa61ca50f74595b17f2254586110058784407d4f58e7fa',
  true,
  'Porta 3 - colaborador-preflight (checagem sincrona chamada pelo Educacional antes de criar staff). Secret compartilhado com erp_integration_config.signing_secret do Educacional.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.webhook_configs
  WHERE nome = 'novus-educacional'
    AND empresa_representada_id = '47bc75bc-0fba-4328-ab76-d5e880546e23'
);
