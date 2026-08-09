-- Recorrência automática de mensalidade: materializar_recorrencias/job-recorrencias já
-- existiam e já funcionam corretamente, mas nenhum cron chamava a RPC (confirmado ao vivo
-- em cron.job antes desta migration -- só 2 jobs, nenhum de recorrência).
SELECT cron.schedule(
  'job_materializar_recorrencias',
  '0 4 * * *',
  $$SELECT public.materializar_recorrencias(30);$$
);

-- gera_financeiro existe em contratos desde sempre e nunca foi consumido por nada. Trigger
-- AFTER INSERT (só insert -- editar um Contrato existente não deve gerar título de novo) cria
-- o primeiro título recorrente quando gera_financeiro=true; o cron acima cuida das parcelas
-- seguintes a partir daí, igual a qualquer outro título recorrente.
CREATE OR REPLACE FUNCTION public.gerar_titulo_inicial_contrato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vencimento date;
BEGIN
  IF NOT NEW.gera_financeiro OR NEW.valor_mensal IS NULL OR NEW.valor_mensal <= 0 THEN
    RETURN NEW;
  END IF;

  v_vencimento := date_trunc('month', COALESCE(NEW.data_inicio, CURRENT_DATE))::date
    + (COALESCE(NEW.dia_vencimento, 5) - 1);

  INSERT INTO public.contas_receber (
    empresa_representada_id, cliente_id, descricao, numero_documento,
    valor_original, data_emissao, data_vencimento, status,
    recorrente, periodicidade, total_parcelas, origem_sistema
  ) VALUES (
    NEW.empresa_representada_id, NEW.cliente_id, NEW.titulo,
    coalesce(NEW.numero_contrato, NEW.id::text) || '-M1',
    NEW.valor_mensal, CURRENT_DATE, v_vencimento, 'PENDENTE',
    true, 'MENSAL', NULL, 'CONTRATO_' || NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gerar_titulo_inicial_contrato
  AFTER INSERT ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_titulo_inicial_contrato();
