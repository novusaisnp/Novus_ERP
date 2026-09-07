-- COMP-1d: Recebimento físico + Match de 3 vias — últimas duas fatias do
-- checklist do Programa Compras e Suprimentos (Onda 1). Uma RPC só, porque no
-- fluxo real confirmar o que chegou fisicamente JÁ é o gatilho do match: quando
-- todos os itens do pedido estão 100% recebidos, o título a pagar nasce
-- sozinho (pedido × recebimento × título), reaproveitando dois motores já
-- maduros — estoque_movimentacoes (Kardex) e o gatilho de lançamento contábil
-- do FIN-4 (trg_contas_pagar_lancar_criado, dispara sozinho ao inserir o
-- título — esta migration não escreve lançamento contábil nenhum na mão).
--
-- Fora de escopo: devolução a fornecedor e "ativar de fato compras.*" — os
-- dois últimos itens do checklist, ainda deliberadamente adiados (mesma
-- decisão das fatias anteriores).

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Bug pré-existente encontrado ao testar: recalc_saldo_estoque() faz
--    INSERT ... ON CONFLICT (empresa_representada_id, produto_id,
--    localizacao_id) mas essa UNIQUE nunca existiu em estoque_saldos — ou
--    seja, TODO recálculo de saldo por localização falhava com 42P10 desde
--    que o módulo de estoque foi criado (tabela real tinha 0 linhas,
--    confirmado antes de aplicar). Corrigido aqui porque o recebimento do
--    COMP-1d é o primeiro fluxo real que dispara esse trigger de ponta a
--    ponta com localização preenchida.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.estoque_saldos
  ADD CONSTRAINT estoque_saldos_empresa_produto_localizacao_key
  UNIQUE (empresa_representada_id, produto_id, localizacao_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Pedido de compra ganha o vínculo pro título gerado + novo status final
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.pedidos_compra
  ADD COLUMN contas_pagar_id uuid REFERENCES public.contas_pagar(id);

ALTER TABLE public.pedidos_compra DROP CONSTRAINT pedidos_compra_status_check;
ALTER TABLE public.pedidos_compra ADD CONSTRAINT pedidos_compra_status_check
  CHECK (status IN ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REJEITADO', 'EMITIDO', 'RECEBIDO', 'CANCELADO'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Recebimento (header) — um pedido pode ter mais de um recebimento
--    (entrega parcial em lotes diferentes)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.recebimentos_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_compra(id),
  criado_por uuid NOT NULL,
  data_recebimento date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recebimentos_compra_pedido_idx ON public.recebimentos_compra (pedido_id);

ALTER TABLE public.recebimentos_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY recebimentos_compra_select ON public.recebimentos_compra
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Itens do recebimento — liga ao item do pedido e à entrada de estoque
--    real que ele gerou (rastreabilidade)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.recebimentos_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id uuid NOT NULL REFERENCES public.recebimentos_compra(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  pedido_item_id uuid NOT NULL REFERENCES public.pedidos_compra_itens(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade_recebida numeric(14, 3) NOT NULL CHECK (quantidade_recebida > 0),
  observacao text,
  estoque_movimentacao_id uuid REFERENCES public.estoque_movimentacoes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX recebimentos_compra_itens_recebimento_idx ON public.recebimentos_compra_itens (recebimento_id);
CREATE INDEX recebimentos_compra_itens_pedido_item_idx ON public.recebimentos_compra_itens (pedido_item_id);

ALTER TABLE public.recebimentos_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY recebimentos_compra_itens_select ON public.recebimentos_compra_itens
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- Sem policy de INSERT/UPDATE/DELETE em nenhuma das duas tabelas — igual
-- solicitacoes_aprovacao (ORC-1): a única porta de escrita é a RPC abaixo,
-- porque confirmar recebimento mexe em 3 tabelas + potencialmente gera título
-- e lançamento contábil atomicamente, e precisa validar quantidade recebida
-- contra o que falta do pedido (nunca confiar no cliente pra isso).

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. confirmar_recebimento_compra — recebimento + match de 3 vias numa RPC só
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_compra(
  p_pedido_id uuid,
  p_itens jsonb,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido record;
  v_item jsonb;
  v_pedido_item record;
  v_ja_recebido numeric;
  v_qtd_recebendo numeric;
  v_localizacao_id uuid;
  v_mov_id uuid;
  v_recebimento_id uuid;
  v_pedido_completo boolean := true;
  v_pi record;
  v_fornecedor_nome text;
  v_valor_total numeric(14, 2);
  v_titulo_id uuid;
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
  IF v_pedido.status <> 'EMITIDO' THEN
    RAISE EXCEPTION 'PEDIDO_NAO_EMITIDO' USING ERRCODE = 'P0001';
  END IF;
  IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'RECEBIMENTO_SEM_ITENS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.recebimentos_compra (empresa_representada_id, pedido_id, criado_por, observacoes)
  VALUES (v_pedido.empresa_representada_id, p_pedido_id, auth.uid(), NULLIF(trim(COALESCE(p_observacoes, '')), ''))
  RETURNING id INTO v_recebimento_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    SELECT * INTO v_pedido_item FROM public.pedidos_compra_itens
      WHERE id = (v_item->>'pedido_item_id')::uuid AND pedido_id = p_pedido_id;
    IF v_pedido_item IS NULL THEN
      RAISE EXCEPTION 'ITEM_NAO_PERTENCE_AO_PEDIDO' USING ERRCODE = 'P0001';
    END IF;

    v_qtd_recebendo := (v_item->>'quantidade_recebida')::numeric;
    IF v_qtd_recebendo IS NULL OR v_qtd_recebendo <= 0 THEN
      RAISE EXCEPTION 'QUANTIDADE_INVALIDA' USING ERRCODE = 'P0001';
    END IF;

    v_localizacao_id := (v_item->>'localizacao_destino_id')::uuid;
    IF v_localizacao_id IS NULL THEN
      RAISE EXCEPTION 'LOCALIZACAO_OBRIGATORIA' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.localizacoes_estoque
      WHERE id = v_localizacao_id AND empresa_representada_id = v_pedido.empresa_representada_id
    ) THEN
      RAISE EXCEPTION 'LOCALIZACAO_INVALIDA' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(quantidade_recebida), 0) INTO v_ja_recebido
      FROM public.recebimentos_compra_itens WHERE pedido_item_id = v_pedido_item.id;

    IF v_ja_recebido + v_qtd_recebendo > v_pedido_item.quantidade THEN
      RAISE EXCEPTION 'QUANTIDADE_EXCEDE_PEDIDO: item % já recebeu % de % pedido(s)',
        v_pedido_item.id, v_ja_recebido, v_pedido_item.quantidade USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.estoque_movimentacoes (
      empresa_representada_id, produto_id, tipo, quantidade, custo_unitario,
      localizacao_destino_id, data_movimento, documento_ref, observacoes, created_by
    ) VALUES (
      v_pedido.empresa_representada_id, v_pedido_item.produto_id, 'ENTRADA', v_qtd_recebendo, v_pedido_item.preco_unitario,
      v_localizacao_id, now(), CONCAT('PEDIDO-', substring(p_pedido_id::text, 1, 8)),
      CONCAT('Recebimento de pedido de compra — ', v_item->>'observacao'), auth.uid()
    ) RETURNING id INTO v_mov_id;

    INSERT INTO public.recebimentos_compra_itens (
      recebimento_id, empresa_representada_id, pedido_item_id, produto_id,
      quantidade_recebida, observacao, estoque_movimentacao_id
    ) VALUES (
      v_recebimento_id, v_pedido.empresa_representada_id, v_pedido_item.id, v_pedido_item.produto_id,
      v_qtd_recebendo, NULLIF(trim(COALESCE(v_item->>'observacao', '')), ''), v_mov_id
    );
  END LOOP;

  -- Match de 3 vias: só gera título quando TODOS os itens do pedido estiverem
  -- 100% recebidos (soma de todos os recebimentos, não só este).
  FOR v_pi IN SELECT * FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id
  LOOP
    SELECT COALESCE(SUM(quantidade_recebida), 0) INTO v_ja_recebido
      FROM public.recebimentos_compra_itens WHERE pedido_item_id = v_pi.id;
    IF v_ja_recebido < v_pi.quantidade THEN
      v_pedido_completo := false;
      EXIT;
    END IF;
  END LOOP;

  IF v_pedido_completo THEN
    SELECT COALESCE(razao_social, nome_fantasia, nome, 'fornecedor') INTO v_fornecedor_nome
      FROM public.entidades WHERE id = v_pedido.fornecedor_id;

    SELECT SUM(quantidade * preco_unitario) INTO v_valor_total
      FROM public.pedidos_compra_itens WHERE pedido_id = p_pedido_id;

    INSERT INTO public.contas_pagar (
      empresa_representada_id, fornecedor_id, descricao, valor_original,
      data_emissao, data_vencimento, data_competencia, status
    ) VALUES (
      v_pedido.empresa_representada_id, v_pedido.fornecedor_id,
      format('Pedido de compra — %s', v_fornecedor_nome), v_valor_total,
      CURRENT_DATE, CURRENT_DATE + 30, CURRENT_DATE, 'PENDENTE'
    ) RETURNING id INTO v_titulo_id;

    UPDATE public.pedidos_compra SET status = 'RECEBIDO', contas_pagar_id = v_titulo_id WHERE id = p_pedido_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'recebimento_id', v_recebimento_id,
    'pedido_completo', v_pedido_completo, 'contas_pagar_id', v_titulo_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirmar_recebimento_compra(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_compra(uuid, jsonb, text) TO authenticated, service_role;
COMMENT ON FUNCTION public.confirmar_recebimento_compra(uuid, jsonb, text) IS
  'COMP-1d: registra recebimento físico (gera ENTRADA real em estoque_movimentacoes por item, localizacao_destino_id obrigatório por item) e, quando o pedido fica 100% recebido, faz o match de 3 vias — gera o título em contas_pagar (o lançamento contábil nasce sozinho via trg_contas_pagar_lancar_criado do FIN-4).';
