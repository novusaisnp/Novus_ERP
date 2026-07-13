
-- ============================================================
-- Fase 1 Fiscal: schema para emissão real de NF-e
-- ============================================================

-- 1) Novos campos em fiscal_documentos_eletronicos
ALTER TABLE public.fiscal_documentos_eletronicos
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_ref TEXT,
  ADD COLUMN IF NOT EXISTS danfe_url TEXT,
  ADD COLUMN IF NOT EXISTS codigo_status_sefaz TEXT,
  ADD COLUMN IF NOT EXISTS tentativas INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultima_tentativa_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fde_provider_ref ON public.fiscal_documentos_eletronicos(provider, provider_ref);
CREATE INDEX IF NOT EXISTS idx_fde_status ON public.fiscal_documentos_eletronicos(status);
CREATE INDEX IF NOT EXISTS idx_fde_venda_id ON public.fiscal_documentos_eletronicos(venda_id);

-- 2) fiscal_provedor_credenciais
CREATE TABLE IF NOT EXISTS public.fiscal_provedor_credenciais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('focusnfe','plugnotas','enotas','nfeio')),
  ambiente TEXT NOT NULL CHECK (ambiente IN ('homologation','production')),
  api_key_secret_ref TEXT NOT NULL,
  base_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (empresa_representada_id, provider, ambiente)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_provedor_credenciais TO authenticated;
GRANT ALL ON public.fiscal_provedor_credenciais TO service_role;

ALTER TABLE public.fiscal_provedor_credenciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_prov_cred_admin_all" ON public.fiscal_provedor_credenciais
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) fiscal_certificados
CREATE TABLE IF NOT EXISTS public.fiscal_certificados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_representada_id UUID NOT NULL REFERENCES public.empresas_representadas(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  senha_secret_ref TEXT NOT NULL,
  thumbprint TEXT,
  cn_subject TEXT,
  valido_de TIMESTAMPTZ,
  valido_ate TIMESTAMPTZ,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_certificados TO authenticated;
GRANT ALL ON public.fiscal_certificados TO service_role;

ALTER TABLE public.fiscal_certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiscal_cert_admin_all" ON public.fiscal_certificados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_fiscal_cert_empresa ON public.fiscal_certificados(empresa_representada_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fiscal_cert_valido_ate ON public.fiscal_certificados(valido_ate) WHERE ativo = TRUE;

-- 4) updated_at triggers
CREATE OR REPLACE FUNCTION public.fiscal_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_fiscal_prov_cred_updated ON public.fiscal_provedor_credenciais;
CREATE TRIGGER trg_fiscal_prov_cred_updated BEFORE UPDATE ON public.fiscal_provedor_credenciais
  FOR EACH ROW EXECUTE FUNCTION public.fiscal_touch_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_cert_updated ON public.fiscal_certificados;
CREATE TRIGGER trg_fiscal_cert_updated BEFORE UPDATE ON public.fiscal_certificados
  FOR EACH ROW EXECUTE FUNCTION public.fiscal_touch_updated_at();

-- 5) Storage RLS policies (buckets criados via ferramenta separada)
-- Só admins podem ler/gravar em fiscal-certificados, fiscal-xml, fiscal-danfe, fiscal-sped
DO $$
BEGIN
  BEGIN
    EXECUTE $POL$
      CREATE POLICY "fiscal_storage_admin_read"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id IN ('fiscal-certificados','fiscal-xml','fiscal-danfe','fiscal-sped')
               AND public.has_role(auth.uid(), 'admin'));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "fiscal_storage_admin_write"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id IN ('fiscal-certificados','fiscal-xml','fiscal-danfe','fiscal-sped')
                    AND public.has_role(auth.uid(), 'admin'));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "fiscal_storage_admin_update"
        ON storage.objects FOR UPDATE TO authenticated
        USING (bucket_id IN ('fiscal-certificados','fiscal-xml','fiscal-danfe','fiscal-sped')
               AND public.has_role(auth.uid(), 'admin'));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    EXECUTE $POL$
      CREATE POLICY "fiscal_storage_admin_delete"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id IN ('fiscal-certificados','fiscal-xml','fiscal-danfe','fiscal-sped')
               AND public.has_role(auth.uid(), 'admin'));
    $POL$;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
