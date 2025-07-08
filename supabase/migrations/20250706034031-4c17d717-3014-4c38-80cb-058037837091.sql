
-- Função para buscar histórico de auditoria
CREATE OR REPLACE FUNCTION public.get_audit_trail(
  p_tabela_nome VARCHAR,
  p_registro_id UUID
)
RETURNS TABLE (
  id UUID,
  operacao VARCHAR,
  dados_antigos JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ,
  origem VARCHAR,
  usuario_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.operacao::VARCHAR,
    h.dados_antigos,
    h.dados_novos,
    h.created_at,
    h.origem,
    h.usuario_id
  FROM public.historico_operacoes h
  WHERE h.tabela_nome = p_tabela_nome
    AND h.registro_id = p_registro_id
  ORDER BY h.created_at DESC;
END;
$$;
