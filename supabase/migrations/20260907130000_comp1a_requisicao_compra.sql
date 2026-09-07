-- COMP-1a: Requisição de compra interna — primeira fatia do Programa Compras
-- e Suprimentos (Onda 1 do Mapa Mestre de Capacidades, docs/PLANO_MESTRE.md).
--
-- Escopo desta fatia: só a captura da necessidade (quem precisa do quê,
-- quando, por quê). Sem cotação, pedido formal, aprovação por alçada ou
-- geração de título — fatias futuras do mesmo programa (ver docs/STATUS.md).
-- O motor de alçadas (ORC-1) não é consumido aqui de propósito: o checklist
-- do COMP-1 liga "aprovação por alçada" ao Pedido de compra formal (item 4),
-- não à Requisição (item 1) — decisão já tomada no PLANO_MESTRE.
-- "Ativar de fato as permissões compras.*" também é item separado, deixado
-- pro fim do programa — por ora qualquer usuário com acesso à empresa pode
-- abrir uma requisição (pedido interno de baixo atrito, sem compromisso
-- financeiro ainda).

CREATE TABLE public.requisicoes_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  solicitante_id uuid NOT NULL,
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  justificativa text NOT NULL,
  data_necessidade date,
  status varchar NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'CANCELADA')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX requisicoes_compra_empresa_status_idx
  ON public.requisicoes_compra (empresa_representada_id, status, created_at DESC);
CREATE INDEX requisicoes_compra_solicitante_idx
  ON public.requisicoes_compra (solicitante_id, created_at DESC);

CREATE TRIGGER trg_requisicoes_compra_updated_at
  BEFORE UPDATE ON public.requisicoes_compra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.requisicoes_compra ENABLE ROW LEVEL SECURITY;

CREATE POLICY requisicoes_compra_select ON public.requisicoes_compra
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY requisicoes_compra_insert ON public.requisicoes_compra
  FOR INSERT
  WITH CHECK (
    solicitante_id = (select auth.uid())
    AND (
      public.user_has_access_to_empresa(empresa_representada_id)
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  );

-- Só o próprio solicitante (ou admin) cancela, só enquanto ABERTA — mesma
-- segregação leve já usada em solicitacoes_aprovacao (ORC-1); não precisa de
-- RPC porque não há autorização de terceiro envolvida nesta fatia.
CREATE POLICY requisicoes_compra_update ON public.requisicoes_compra
  FOR UPDATE
  USING (
    status = 'ABERTA'
    AND (
      solicitante_id = (select auth.uid())
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  )
  WITH CHECK (
    status IN ('ABERTA', 'CANCELADA')
    AND (
      solicitante_id = (select auth.uid())
      OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
    )
  );

-- Itens da requisição — empresa_representada_id denormalizado pra RLS simples,
-- mesmo padrão já usado em itens_venda (não é EXISTS contra a tabela pai).
CREATE TABLE public.requisicoes_compra_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id uuid NOT NULL REFERENCES public.requisicoes_compra(id) ON DELETE CASCADE,
  empresa_representada_id uuid NOT NULL REFERENCES public.empresas_representadas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade numeric(14, 3) NOT NULL CHECK (quantidade > 0),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX requisicoes_compra_itens_requisicao_idx
  ON public.requisicoes_compra_itens (requisicao_id);

ALTER TABLE public.requisicoes_compra_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY requisicoes_compra_itens_select ON public.requisicoes_compra_itens
  FOR SELECT
  USING (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );

CREATE POLICY requisicoes_compra_itens_insert ON public.requisicoes_compra_itens
  FOR INSERT
  WITH CHECK (
    public.user_has_access_to_empresa(empresa_representada_id)
    OR public.has_role_for_empresa((select auth.uid()), 'admin', empresa_representada_id)
  );
