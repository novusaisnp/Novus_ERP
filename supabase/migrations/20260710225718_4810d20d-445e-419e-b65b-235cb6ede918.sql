GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.empresa_responsavel TO authenticated;
GRANT ALL ON TABLE public.empresa_responsavel TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.empresas_representadas TO authenticated;
GRANT ALL ON TABLE public.empresas_representadas TO service_role;