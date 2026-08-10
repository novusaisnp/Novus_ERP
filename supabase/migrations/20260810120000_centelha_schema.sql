-- NovusAI Centelha — schema isolado de licenciamento/provisionamento de clientes.
-- Isolamento real (não cosmético): PostgREST expõe schema só se listado em
-- supabase/config.toml `[api] schemas`, e mesmo listado, sem GRANT nenhum a
-- authenticated/anon o acesso é negado a nível de Postgres (42501) antes de
-- qualquer RLS ser avaliada. RLS habilitado sem policy é a segunda camada.

CREATE SCHEMA IF NOT EXISTS centelha;

-- Postgres concede USAGE a PUBLIC por padrão em schema novo — sem este REVOKE
-- explícito, authenticated/anon herdam acesso via PUBLIC e o isolamento não vale nada.
REVOKE ALL ON SCHEMA centelha FROM PUBLIC;
GRANT USAGE ON SCHEMA centelha TO service_role;

CREATE TABLE centelha.owners (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id)
);

CREATE TABLE centelha.satelites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  base_url text NOT NULL,
  provisioning_secret text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE centelha.licencas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id),
  satelite_id uuid NOT NULL REFERENCES centelha.satelites(id),
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'suspensa', 'cancelada')),
  tenant_ref uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_centelha_licencas_cliente ON centelha.licencas(cliente_id);
CREATE INDEX idx_centelha_licencas_satelite ON centelha.licencas(satelite_id);

ALTER TABLE centelha.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE centelha.satelites ENABLE ROW LEVEL SECURITY;
ALTER TABLE centelha.licencas ENABLE ROW LEVEL SECURITY;

-- Nenhuma policy criada de propósito: RLS habilitado sem policy nega tudo para
-- authenticated/anon. Só service_role (que ignora RLS) acessa.
GRANT ALL ON ALL TABLES IN SCHEMA centelha TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA centelha GRANT ALL ON TABLES TO service_role;
