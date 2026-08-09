-- Corrige transferencia_bancaria_atomica: a função gravava apenas a coluna
-- `tipo` (TRANSFERENCIA_SAIDA/TRANSFERENCIA_ENTRADA) e deixava `tipo_movimentacao`
-- NULL. Toda a UI (MovimentacoesBancariasTable, filtros, estatísticas) lê
-- `tipo_movimentacao`, então transferências ficavam gravadas mas invisíveis
-- nos filtros por tipo e ausentes das estatísticas.
CREATE OR REPLACE FUNCTION public.transferencia_bancaria_atomica(
  p_empresa_id uuid, p_conta_origem_id uuid, p_conta_destino_id uuid, p_valor numeric,
  p_data_lancamento date, p_descricao text, p_lote_descricao text,
  p_natureza_id uuid, p_plano_conta_id uuid, p_centro_custo_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lote_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.user_has_access_to_empresa(p_empresa_id) THEN
    RAISE EXCEPTION 'access denied for empresa %', p_empresa_id USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.lotes_movimentacoes (empresa_representada_id, tipo, descricao, valor_total, data_lancamento)
  VALUES (p_empresa_id, 'TRANSFERENCIA', p_lote_descricao, p_valor, p_data_lancamento)
  RETURNING id INTO v_lote_id;

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, conta_destino_id, lote_id, tipo, tipo_movimentacao, valor,
    data_lancamento, data_movimentacao, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_origem_id, p_conta_destino_id, v_lote_id, 'TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_SAIDA', p_valor,
    p_data_lancamento, p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  INSERT INTO public.movimentacoes_bancarias (
    empresa_representada_id, conta_bancaria_id, conta_destino_id, lote_id, tipo, tipo_movimentacao, valor,
    data_lancamento, data_movimentacao, descricao, status, natureza_id, plano_conta_id, centro_custo_id, created_by
  ) VALUES (
    p_empresa_id, p_conta_destino_id, p_conta_origem_id, v_lote_id, 'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_ENTRADA', p_valor,
    p_data_lancamento, p_data_lancamento, p_descricao, 'EFETIVADO', p_natureza_id, p_plano_conta_id, p_centro_custo_id, auth.uid()
  );

  RETURN v_lote_id;
END;
$$;

-- Backfill: linhas de transferência já gravadas com tipo_movimentacao NULL
-- (afetadas pelo bug acima) e conta_destino_id ausente.
UPDATE public.movimentacoes_bancarias m
SET tipo_movimentacao = m.tipo
WHERE m.tipo_movimentacao IS NULL AND m.tipo IS NOT NULL;

-- Backfill: data_movimentacao ausente quebra filtro de período (gte/lte),
-- que silenciosamente exclui linhas com data_movimentacao NULL.
UPDATE public.movimentacoes_bancarias m
SET data_movimentacao = m.data_lancamento
WHERE m.data_movimentacao IS NULL AND m.data_lancamento IS NOT NULL;

UPDATE public.movimentacoes_bancarias m
SET conta_destino_id = outra.conta_bancaria_id
FROM public.movimentacoes_bancarias outra
WHERE m.conta_destino_id IS NULL
  AND m.lote_id IS NOT NULL
  AND m.lote_id = outra.lote_id
  AND m.id <> outra.id
  AND m.tipo IN ('TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA')
  AND outra.tipo IN ('TRANSFERENCIA_SAIDA', 'TRANSFERENCIA_ENTRADA')
  AND m.tipo <> outra.tipo;
