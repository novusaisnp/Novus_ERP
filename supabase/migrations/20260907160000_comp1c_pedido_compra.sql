-- COMP-1c: Pedido de Compra formal — nasce de uma cotação FECHADA (um pedido
-- por fornecedor vencedor, já que um pedido de compra é sempre um documento
-- endereçado a UM fornecedor), passa por aprovação por alçada (ORC-1 —
-- primeiro consumidor real do motor) antes de ser considerado emitido.
-- Terceira fatia do Programa Compras e Suprimentos (Onda 1).
--
-- Ações que mexem em dinheiro/estado sensível (gerar pedido a partir da
-- cotação, enviar pra aprovação, marcar emitido) são RPC SECURITY DEFINER —
-- nunca RLS pura — porque precisam computar valor_total no servidor (nunca
-- confiar em valor vindo do cliente pra decidir a alçada) e orquestrar mais
-- de uma tabela atomicamente. Edição solta (observações) enquanto RASCUNHO
-- continua RLS pura, mesma filosofia do COMP-1a/1b.
--
-- Fora de escopo desta fatia: recebimento físico e match de 3 vias (próximas
-- fatias do checklist).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Pedido (header)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.pedidos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes_compra(id),
  requisicao_id uuid NOT NULL REFERENCES public.requisicoes_compra(id),
  fornecedor_id uuid NOT NULL REFERENCES public.entidades(id),
  criado_por uuid NOT NULL,
  status varchar NOT NULL DEFAULT 'RASCUNHO'
    CHECK (status IN ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'EMITIDO', 'CANCELADO')),
  solicitacao_aprovacao_id uuid REFERENCES public.solicitacoes_aprovacao(id),
  observacoes text,
  emitido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_id, fornecedor_id)
);

CREATE INDEX pedidos_compra_empresa_status_idx
  ON public.pedidos_compra (empresa_representada_id, status, created_at DESC);
CREATE INDEX pedidos_compra_cotacao_idx ON public.pedidos_compra (cotacao_id);

CREATE TRIGGER trg_pedidos_compra_updated_at
  BEFORE UPDATE ON public.pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY pedidos_compra_select ON public.pedidos_compra
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- Escrita direta pela tabela só edita campos soltos (observações) SEM tocar
-- status — WITH CHECK exige status = 'RASCUNHO' tanto antes quanto depois,
-- então nenhuma transição de status passa por aqui. Toda mudança de status
-- (enviar p/ aprovação, emitir, cancelar) é RPC, mais abaixo.
CREATE POLICY pedidos_compra_update_rascunho ON public.pedidos_compra
  FOR UPDATE
  USING (
    status = 'RASCUNHO'
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  )
  WITH CHECK (
    status = 'RASCUNHO'
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Itens do pedido
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.pedidos_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_compra(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  requisicao_item_id uuid NOT NULL REFERENCES public.requisicoes_compra_itens(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric(14, 3) NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(14, 2) NOT NULL CHECK (preco_unitario > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pedidos_compra_itens_pedido_idx ON public.pedidos_compra_itens (pedido_id);

ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY pedidos_compra_itens_select ON public.pedidos_compra_itens
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. gerar_pedidos_compra_da_cotacao: 1 pedido por fornecedor vencedor,
--    idempotente (chamar de novo não duplica pedido já gerado pro mesmo par
--    cotação+fornecedor — UNIQUE cuida disso).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.gerar_pedidos_compra_da_cotacao(p_cotacao_id uuid)
RETURNS SETOF public.pedidos_compra
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cotacao record;
  v_fornecedor record;
  v_pedido_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cotacao FROM public.cotacoes_compra WHERE id = p_cotacao_id;
  IF v_cotacao IS NULL THEN
    RAISE EXCEPTION 'COTACAO_NAO_ENCONTRADA' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(v_cotacao.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_cotacao.status <> 'FECHADA' THEN
    RAISE EXCEPTION 'COTACAO_NAO_FECHADA' USING ERRCODE = 'P0001';
  END IF;

  FOR v_fornecedor IN
    SELECT DISTINCT fornecedor_id FROM public.cotacoes_compra_precos
    WHERE cotacao_id = p_cotacao_id AND vencedor
  LOOP
    SELECT id INTO v_pedido_id FROM public.pedidos_compra
      WHERE cotacao_id = p_cotacao_id AND fornecedor_id = v_fornecedor.fornecedor_id;

    IF v_pedido_id IS NULL THEN
      INSERT INTO public.pedidos_compra (empresa_representada_id, cotacao_id, requisicao_id, fornecedor_id, criado_por)
      VALUES (v_cotacao.empresa_representada_id, p_cotacao_id, v_cotacao.requisicao_id, v_fornecedor.fornecedor_id, auth.uid())
      RETURNING id INTO v_pedido_id;

      INSERT INTO public.pedidos_compra_itens (pedido_id, empresa_representada_id, requisicao_item_id, produto_id, quantidade, preco_unitario)
      SELECT v_pedido_id, v_cotacao.empresa_representada_id, ri.id, ri.produto_id, ri.quantidade, cp.preco_unitario
      FROM public.cotacoes_compra_precos cp
      JOIN public.requisicoes_compra_itens ri ON ri.id = cp.requisicao_item_id
      WHERE cp.cotacao_id = p_cotacao_id AND cp.fornecedor_id = v_fornecedor.fornecedor_id AND cp.vencedor;
    END IF;

    RETURN QUERY SELECT * FROM public.pedidos_compra WHERE id = v_pedido_id;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.gerar_pedidos_compra_da_cotacao(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_pedidos_compra_da_cotacao(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.gerar_pedidos_compra_da_cotacao(uuid) IS
  'COMP-1c: gera 1 pedido de compra (RASCUNHO) por fornecedor vencedor de uma cotação FECHADA. Idempotente por (cotacao_id, fornecedor_id).';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. enviar_pedido_compra_para_aprovacao: computa valor_total no servidor
--    (nunca confia em valor do cliente) e consome o motor de alçadas (ORC-1).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enviar_pedido_compra_para_aprovacao(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
  v_valor_total numeric(14, 2);
  v_qtd_itens int;
  v_fornecedor_nome text;
  v_resultado jsonb;
  v_status_final text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_E_RASCUNHO' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*), COALESCE(SUM(quantidade * preco_unitario), 0)
    INTO v_qtd_itens, v_valor_total
  FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id;

  IF v_qtd_itens = 0 THEN
    RAISE EXCEPTION 'PEDIDO_SEM_ITENS' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(razao_social, nome_fantasia, nome, 'fornecedor') INTO v_fornecedor_nome
    FROM public.entidades WHERE id = v_pedido.fornecedor_id;

  v_resultado := public.solicitar_aprovacao(
    v_pedido.empresa_representada_id,
    'COMPRA',
    v_valor_total,
    format('Pedido de compra — %s (%s itens)', v_fornecedor_nome, v_qtd_itens),
    jsonb_build_object('pedido_id', p_pedido_id, 'fornecedor_id', v_pedido.fornecedor_id),
    'pedidos_compra',
    p_pedido_id
  );

  v_status_final := CASE WHEN v_resultado->>'status' = 'AUTO_APROVADO' THEN 'APROVADO' ELSE 'AGUARDANDO_APROVACAO' END;

  UPDATE public.pedidos_compra
  SET status = v_status_final,
      solicitacao_aprovacao_id = (v_resultado->>'solicitacao_id')::uuid
  WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true, 'status', v_status_final, 'valor_total', v_valor_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_pedido_compra_para_aprovacao(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_pedido_compra_para_aprovacao(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.enviar_pedido_compra_para_aprovacao(uuid) IS
  'COMP-1c: computa valor_total no servidor e consome ORC-1 (solicitar_aprovacao, categoria COMPRA). RASCUNHO -> APROVADO (auto) ou AGUARDANDO_APROVACAO.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Sincroniza pedidos_compra.status quando a solicitação de aprovação
--    ligada a ele é decidida (aprovada/rejeitada) em qualquer lugar — inclusive
--    pela Central de Aprovações, não só por quem enviou o pedido.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_pedido_compra_status_from_aprovacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.origem_tabela = 'pedidos_compra' AND NEW.origem_id IS NOT NULL AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'APROVADO' THEN
      UPDATE public.pedidos_compra SET status = 'APROVADO' WHERE id = NEW.origem_id AND status = 'AGUARDANDO_APROVACAO';
    ELSIF NEW.status = 'REJEITADO' THEN
      UPDATE public.pedidos_compra SET status = 'REJEITADO' WHERE id = NEW.origem_id AND status = 'AGUARDANDO_APROVACAO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_pedido_compra_status
  AFTER UPDATE ON public.solicitacoes_aprovacao
  FOR EACH ROW EXECUTE FUNCTION public.sync_pedido_compra_status_from_aprovacao();

REVOKE EXECUTE ON FUNCTION public.sync_pedido_compra_status_from_aprovacao() FROM PUBLIC, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. marcar_pedido_compra_emitido / cancelar_pedido_compra — transições de
--    status simples, mas via RPC pra manter a regra "só RLS pura muda estado
--    RASCUNHO<->RASCUNHO" sem exceção.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marcar_pedido_compra_emitido(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status <> 'APROVADO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_APROVADO' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pedidos_compra SET status = 'EMITIDO', emitido_em = now() WHERE id = p_pedido_id;
  RETURN jsonb_build_object('ok', true, 'status', 'EMITIDO');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marcar_pedido_compra_emitido(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_pedido_compra_emitido(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancelar_pedido_compra(p_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido FROM public.pedidos_compra WHERE id = p_pedido_id FOR UPDATE;
  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'PEDIDO_NAO_ENCONTRADO' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.user_has_access_to_empresa(v_pedido.empresa_representada_id) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = '42501';
  END IF;
  IF v_pedido.status NOT IN ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'REJEITADO') THEN
    RAISE EXCEPTION 'PEDIDO_NAO_CANCELAVEL' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pedidos_compra SET status = 'CANCELADO' WHERE id = p_pedido_id;
  RETURN jsonb_build_object('ok', true, 'status', 'CANCELADO');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancelar_pedido_compra(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_pedido_compra(uuid) TO authenticated, service_role;
