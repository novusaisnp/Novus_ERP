-- COMP-1b: Cotação de compra — mapa comparativo de preços entre fornecedores,
-- vencedor por item. Segunda fatia do Programa Compras e Suprimentos (Onda 1,
-- docs/PLANO_MESTRE.md).
--
-- Escopo desta fatia: registrar cotações manuais — quem faz compras transcreve
-- o que cada fornecedor cotou (telefone/e-mail/WhatsApp), não existe portal de
-- fornecedor nem envio automático (mesma realidade do COM-1: EmailProvider é
-- stub dormente). Monta o mapa comparativo (itens × fornecedores) e permite
-- marcar o vencedor por item. Pedido de compra formal (que nasce da cotação
-- fechada) é a próxima fatia — fora de escopo aqui.
-- Fornecedor = entidades com entidade_papeis.papel = 'FORNECEDOR' (Cadastro
-- Unificado de Entidades), reaproveitado sem alteração.
-- Sem RPC — mesma filosofia do COMP-1a: autorização via RLS, qualquer usuário
-- com acesso à empresa participa; "ativar de fato compras.*" continua item
-- separado do checklist, deixado pro fim do programa.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Cotação (header) — sempre a partir de uma requisição existente
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.cotacoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  requisicao_id uuid NOT NULL REFERENCES public.requisicoes_compra(id),
  criado_por uuid NOT NULL,
  status varchar NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'FECHADA', 'CANCELADA')),
  prazo_resposta date,
  observacoes text,
  fechada_em timestamptz,
  fechada_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cotacoes_compra_empresa_status_idx
  ON public.cotacoes_compra (empresa_representada_id, status, created_at DESC);
CREATE INDEX cotacoes_compra_requisicao_idx
  ON public.cotacoes_compra (requisicao_id);

CREATE TRIGGER trg_cotacoes_compra_updated_at
  BEFORE UPDATE ON public.cotacoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cotacoes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotacoes_compra_select ON public.cotacoes_compra
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY cotacoes_compra_insert ON public.cotacoes_compra
  FOR INSERT
  WITH CHECK (
    criado_por = (select auth.uid())
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  );

-- Fechar/cancelar (única transição permitida por UPDATE — qualquer um com
-- acesso à empresa, não só o criador, já que cotação é trabalho de equipe de
-- compras, diferente da requisição individual do COMP-1a).
CREATE POLICY cotacoes_compra_update ON public.cotacoes_compra
  FOR UPDATE
  USING (
    status = 'ABERTA'
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  )
  WITH CHECK (
    status IN ('ABERTA', 'FECHADA', 'CANCELADA')
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Fornecedores convidados (participantes da cotação)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.cotacoes_compra_fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  fornecedor_id uuid NOT NULL REFERENCES public.entidades(id),
  convidado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_id, fornecedor_id)
);

CREATE INDEX cotacoes_compra_fornecedores_cotacao_idx
  ON public.cotacoes_compra_fornecedores (cotacao_id);

ALTER TABLE public.cotacoes_compra_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotacoes_compra_fornecedores_select ON public.cotacoes_compra_fornecedores
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- Convidar/remover fornecedor só enquanto a cotação estiver ABERTA — sem essa
-- checagem, uma cotação FECHADA continuaria editável indefinidamente.
CREATE POLICY cotacoes_compra_fornecedores_insert ON public.cotacoes_compra_fornecedores
  FOR INSERT
  WITH CHECK (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  );

CREATE POLICY cotacoes_compra_fornecedores_delete ON public.cotacoes_compra_fornecedores
  FOR DELETE
  USING (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Mapa comparativo — preço por item por fornecedor, vencedor por item
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE public.cotacoes_compra_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes_compra(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  requisicao_item_id uuid NOT NULL REFERENCES public.requisicoes_compra_itens(id),
  fornecedor_id uuid NOT NULL REFERENCES public.entidades(id),
  preco_unitario numeric(14, 2) NOT NULL CHECK (preco_unitario > 0),
  prazo_entrega_dias integer CHECK (prazo_entrega_dias IS NULL OR prazo_entrega_dias >= 0),
  observacao text,
  vencedor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cotacao_id, requisicao_item_id, fornecedor_id)
);

-- No máximo um vencedor por item dentro da mesma cotação.
CREATE UNIQUE INDEX cotacoes_compra_precos_um_vencedor_por_item
  ON public.cotacoes_compra_precos (cotacao_id, requisicao_item_id)
  WHERE vencedor;

CREATE INDEX cotacoes_compra_precos_cotacao_idx
  ON public.cotacoes_compra_precos (cotacao_id);

CREATE TRIGGER trg_cotacoes_compra_precos_updated_at
  BEFORE UPDATE ON public.cotacoes_compra_precos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cotacoes_compra_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cotacoes_compra_precos_select ON public.cotacoes_compra_precos
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

-- Mesma trava: preço só é inserível/editável/removível enquanto a cotação
-- estiver ABERTA.
CREATE POLICY cotacoes_compra_precos_insert ON public.cotacoes_compra_precos
  FOR INSERT
  WITH CHECK (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  );

CREATE POLICY cotacoes_compra_precos_update ON public.cotacoes_compra_precos
  FOR UPDATE
  USING (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  )
  WITH CHECK (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  );

CREATE POLICY cotacoes_compra_precos_delete ON public.cotacoes_compra_precos
  FOR DELETE
  USING (
    (public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id))
    AND EXISTS (SELECT 1 FROM public.cotacoes_compra c WHERE c.id = cotacao_id AND c.status = 'ABERTA')
  );
