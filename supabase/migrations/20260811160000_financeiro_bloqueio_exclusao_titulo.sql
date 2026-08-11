-- Impede excluir titulo que ja tem liquidacao ativa (FIN-0, lacuna L3).
--
-- A guarda vive no banco, e nao no servico, porque assim vale para qualquer caminho de
-- escrita: os servicos atuais de pagar e receber, RPCs futuras e SQL direto. Correcao de
-- titulo movimentado deve ocorrer por estorno da liquidacao, nunca por exclusao.
--
-- Cobre as duas formas de exclusao usadas no projeto: o soft delete (deleted_at saindo de
-- NULL) e o DELETE fisico.

CREATE OR REPLACE FUNCTION public.impedir_exclusao_titulo_liquidado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_titulo_id uuid;
  v_tipo text;
  v_liquidacoes integer;
BEGIN
  v_titulo_id := OLD.id;
  v_tipo := CASE TG_TABLE_NAME
              WHEN 'contas_pagar' THEN 'CONTAS_PAGAR'
              ELSE 'CONTAS_RECEBER'
            END;

  -- Soft delete so interessa quando deleted_at esta saindo de NULL; qualquer outro UPDATE passa.
  IF TG_OP = 'UPDATE' AND NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  -- Considera tanto o vinculo novo (titulo_id/tipo_titulo) quanto o legado, para nao deixar
  -- passar liquidacao gravada antes da unificacao.
  SELECT count(*) INTO v_liquidacoes
  FROM liquidacoes_titulos l
  WHERE COALESCE(l.estornado, false) = false
    AND COALESCE(l.cancelada, false) = false
    AND (
      (l.titulo_id = v_titulo_id AND l.tipo_titulo = v_tipo)
      OR (v_tipo = 'CONTAS_PAGAR' AND l.conta_pagar_id = v_titulo_id)
      OR (v_tipo = 'CONTAS_RECEBER' AND l.conta_receber_id = v_titulo_id)
    );

  IF v_liquidacoes > 0 THEN
    RAISE EXCEPTION
      'Titulo possui % liquidacao(oes) ativa(s) e nao pode ser excluido; estorne as baixas antes',
      v_liquidacoes
      USING ERRCODE = '23503';
  END IF;

  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_impedir_exclusao_contas_pagar ON public.contas_pagar;
CREATE TRIGGER trg_impedir_exclusao_contas_pagar
  BEFORE UPDATE OR DELETE ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.impedir_exclusao_titulo_liquidado();

DROP TRIGGER IF EXISTS trg_impedir_exclusao_contas_receber ON public.contas_receber;
CREATE TRIGGER trg_impedir_exclusao_contas_receber
  BEFORE UPDATE OR DELETE ON public.contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.impedir_exclusao_titulo_liquidado();
