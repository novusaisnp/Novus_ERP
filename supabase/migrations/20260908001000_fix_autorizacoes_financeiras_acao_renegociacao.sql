-- Corrige um esquecimento na migration anterior (20260908000000): a checagem de
-- autorização (financeiro_exigir_autorizacao_titulo) aceita qualquer texto em p_acao
-- (sem enum no lado da função), mas a tabela onde o ticket é EMITIDO
-- (autorizacoes_financeiras, via edge function financeiro-autorizar) tem seu próprio
-- CHECK constraint restringindo os valores válidos — e esse eu não tinha atualizado.
-- Achado ao rodar a prova SQL da renegociação (emissão de ticket de teste falhou).

ALTER TABLE public.autorizacoes_financeiras DROP CONSTRAINT autorizacoes_financeiras_acao_check;
ALTER TABLE public.autorizacoes_financeiras ADD CONSTRAINT autorizacoes_financeiras_acao_check
  CHECK ((acao = ANY (ARRAY['LIQUIDACAO_RETROATIVA', 'ESTORNO', 'CANCELAMENTO', 'RENEGOCIACAO']::text[])));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'autorizacoes_financeiras_acao_check'
      AND pg_get_constraintdef(oid) LIKE '%RENEGOCIACAO%'
  ) THEN
    RAISE EXCEPTION 'autorizacoes_financeiras_acao_check nao inclui RENEGOCIACAO';
  END IF;
END $$;
