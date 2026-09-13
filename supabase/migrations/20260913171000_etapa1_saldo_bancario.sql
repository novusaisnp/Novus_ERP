-- O UPDATE da conta já segura a linha: o delta usa OLD atual, nunca um snapshot do browser.
-- Histórico é append-only para o usuário; o trigger deve conseguir gravá-lo.
ALTER FUNCTION public.registrar_historico_conta_bancaria() SECURITY DEFINER;
ALTER FUNCTION public.registrar_historico_conta_bancaria() SET search_path=public;
REVOKE EXECUTE ON FUNCTION public.registrar_historico_conta_bancaria() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.etapa1_saldo_inicial_conta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.saldo_inicial,0)::text IN ('NaN','Infinity','-Infinity') THEN
    RAISE EXCEPTION 'Saldo inicial inválido';
  END IF;
  IF TG_OP='INSERT' THEN
    NEW.saldo_atual := COALESCE(NEW.saldo_inicial,0);
  ELSE
    IF NEW.empresa_representada_id IS DISTINCT FROM OLD.empresa_representada_id THEN
      RAISE EXCEPTION 'Empresa da conta é imutável' USING ERRCODE='42501';
    END IF;
    IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND auth.uid() IS NOT NULL THEN
      PERFORM public.exigir_permissao_empresa(OLD.empresa_representada_id,'financeiro.delete');
    END IF;
    IF NEW.saldo_inicial IS DISTINCT FROM OLD.saldo_inicial THEN
      NEW.saldo_atual := COALESCE(OLD.saldo_atual,0) + COALESCE(NEW.saldo_inicial,0) - COALESCE(OLD.saldo_inicial,0);
    ELSIF current_user IN ('authenticated','anon') AND NEW.saldo_atual IS DISTINCT FROM OLD.saldo_atual THEN
      RAISE EXCEPTION 'Saldo é calculado pelas movimentações' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER etapa1_saldo_inicial BEFORE INSERT OR UPDATE ON public.contas_bancarias
FOR EACH ROW EXECUTE FUNCTION public.etapa1_saldo_inicial_conta();

CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta_movimentacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_conta uuid; v_ids uuid[]; v_empresa uuid; v_inicial numeric; v_movimento numeric;
BEGIN
  v_ids := CASE WHEN TG_OP='INSERT' THEN ARRAY[NEW.conta_bancaria_id]
    WHEN TG_OP='DELETE' THEN ARRAY[OLD.conta_bancaria_id]
    ELSE ARRAY[OLD.conta_bancaria_id,NEW.conta_bancaria_id] END;
  -- Mesma ordem para mudanças de conta; o lock antecede TODAS as leituras do saldo.
  FOR v_conta IN SELECT DISTINCT x FROM unnest(v_ids) x WHERE x IS NOT NULL ORDER BY x LOOP
    SELECT empresa_representada_id,COALESCE(saldo_inicial,0) INTO v_empresa,v_inicial
      FROM public.contas_bancarias WHERE id=v_conta FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Conta bancária inexistente'; END IF;
    IF v_empresa IS DISTINCT FROM COALESCE(NEW.empresa_representada_id,OLD.empresa_representada_id) THEN
      RAISE EXCEPTION 'Conta bancária pertence a outra empresa' USING ERRCODE='42501';
    END IF;
    SELECT COALESCE(sum(CASE
      WHEN tipo IN ('DEPOSITO','TRANSFERENCIA_ENTRADA','AJUSTE_POSITIVO','PIX_ENTRADA','TED_ENTRADA','DOC_ENTRADA','JUROS') THEN valor
      WHEN tipo IN ('SAQUE','TRANSFERENCIA_SAIDA','AJUSTE_NEGATIVO','PIX_SAIDA','TED_SAIDA','DOC_SAIDA','BOLETO','TARIFA') THEN -valor
      ELSE 0 END),0) INTO v_movimento
      FROM public.movimentacoes_bancarias WHERE conta_bancaria_id=v_conta AND empresa_representada_id=v_empresa
        AND status='EFETIVADO' AND deleted_at IS NULL;
    UPDATE public.contas_bancarias SET saldo_atual=v_inicial+v_movimento WHERE id=v_conta AND empresa_representada_id=v_empresa;
  END LOOP;
  RETURN COALESCE(NEW,OLD);
END;
$$;
DROP TRIGGER trigger_atualizar_saldo ON public.movimentacoes_bancarias;
CREATE TRIGGER trigger_atualizar_saldo AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes_bancarias
FOR EACH ROW EXECUTE FUNCTION public.atualizar_saldo_conta_movimentacao();
