-- Cadastro Unificado de Entidades — Fase 2a (ERP): Sócios + Colaboradores
-- Migrados juntos porque usuarios_pessoa_xor_chk acopla os dois (mesma
-- constraint, mesmo NovoUsuarioModal). Ambas as tabelas de origem estão
-- vazias no momento desta migração (baseline 2026-08-10) — backfill é
-- defensivo/idempotente pra dado futuro, não migra nada real agora.

-- 1) Backfill: socios_representantes → entidades + entidade_papeis
INSERT INTO public.entidades (id, empresa_representada_id, tipo_pessoa, nome, cpf, email, telefone, ativo, deleted_at)
SELECT s.id, s.empresa_representada_id, 'PF', s.nome, s.cpf, s.email, s.telefone, s.ativo, s.deleted_at
FROM public.socios_representantes s
WHERE NOT EXISTS (
  SELECT 1 FROM public.entidades e
  WHERE e.empresa_representada_id = s.empresa_representada_id AND e.cpf = s.cpf AND s.cpf IS NOT NULL
);

-- Colisão: mesmo CPF já virou entidade por outra origem (ex.: também é
-- colaborador). Registra o mapeamento pra Fase 2 saber pra onde apontar.
INSERT INTO public.entidade_id_map (tabela_origem, id_origem, entidade_id)
SELECT 'socios_representantes', s.id, e.id
FROM public.socios_representantes s
JOIN public.entidades e ON e.empresa_representada_id = s.empresa_representada_id AND e.cpf = s.cpf AND s.cpf IS NOT NULL
WHERE e.id <> s.id;

INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel, ativo, participacao_percentual, cargo_societario)
SELECT COALESCE(m.entidade_id, s.id), s.empresa_representada_id, s.tipo, s.ativo, s.participacao_percentual, s.cargo_societario
FROM public.socios_representantes s
LEFT JOIN public.entidade_id_map m ON m.tabela_origem = 'socios_representantes' AND m.id_origem = s.id
ON CONFLICT (entidade_id, papel) DO NOTHING;

-- 2) Backfill: colaboradores → entidades + entidade_papeis + entidade_dados_colaborador
INSERT INTO public.entidades (
  id, empresa_representada_id, tipo_pessoa, nome, cpf, rg, data_nascimento,
  email, telefone, celular, whatsapp, cep, logradouro, numero, complemento,
  bairro, cidade, estado, banco, agencia, conta, tipo_conta, ativo, deleted_at
)
SELECT c.id, c.empresa_representada_id, 'PF', c.nome, c.cpf, c.rg, c.data_nascimento,
  COALESCE(c.email, c.email_corporativo), c.telefone, c.celular, c.whatsapp, c.cep, c.logradouro, c.numero,
  c.complemento, c.bairro, c.cidade, c.estado, c.banco, c.agencia, c.conta, c.tipo_conta,
  COALESCE(c.ativo, true), c.deleted_at
FROM public.colaboradores c
WHERE NOT EXISTS (
  SELECT 1 FROM public.entidades e
  WHERE e.empresa_representada_id = c.empresa_representada_id AND e.cpf = c.cpf AND c.cpf IS NOT NULL
);

INSERT INTO public.entidade_id_map (tabela_origem, id_origem, entidade_id)
SELECT 'colaboradores', c.id, e.id
FROM public.colaboradores c
JOIN public.entidades e ON e.empresa_representada_id = c.empresa_representada_id AND e.cpf = c.cpf AND c.cpf IS NOT NULL
WHERE e.id <> c.id;

INSERT INTO public.entidade_papeis (entidade_id, empresa_representada_id, papel, ativo)
SELECT COALESCE(m.entidade_id, c.id), c.empresa_representada_id, 'COLABORADOR', COALESCE(c.ativo, true)
FROM public.colaboradores c
LEFT JOIN public.entidade_id_map m ON m.tabela_origem = 'colaboradores' AND m.id_origem = c.id
ON CONFLICT (entidade_id, papel) DO NOTHING;

INSERT INTO public.entidade_dados_colaborador (
  entidade_id, cargo_id, departamento_id, setor_id, data_admissao, data_demissao,
  tipo_contrato, regime_trabalho, carga_horaria, salario, pis, ctps, serie_ctps,
  foto_url, estado_civil, escolaridade, sexo
)
SELECT COALESCE(m.entidade_id, c.id), c.cargo_id, c.departamento_id, c.setor_id, c.data_admissao,
  c.data_demissao, c.tipo_contrato, c.regime_trabalho, c.carga_horaria, c.salario, c.pis, c.ctps,
  c.serie_ctps, c.foto_url, c.estado_civil, c.escolaridade, c.sexo
FROM public.colaboradores c
LEFT JOIN public.entidade_id_map m ON m.tabela_origem = 'colaboradores' AND m.id_origem = c.id
ON CONFLICT (entidade_id) DO NOTHING;

-- 3) usuarios.entidade_id — resolve via mapa (cobre colisão) ou id direto
UPDATE public.usuarios u
SET entidade_id = COALESCE(
  (SELECT m.entidade_id FROM public.entidade_id_map m WHERE m.tabela_origem = 'colaboradores' AND m.id_origem = u.colaborador_id),
  u.colaborador_id,
  (SELECT m.entidade_id FROM public.entidade_id_map m WHERE m.tabela_origem = 'socios_representantes' AND m.id_origem = u.socio_id),
  u.socio_id
)
WHERE (u.colaborador_id IS NOT NULL OR u.socio_id IS NOT NULL) AND u.entidade_id IS NULL;

-- 4) Realinhar FK dependentes pra entidades(id) — mantém nome de coluna
-- (colaborador_id/responsavel_id), só troca o alvo da FK. IDs preservados no
-- backfill fazem isso funcionar sem reescrever nenhuma linha de dado.
ALTER TABLE public.folha_pagamento DROP CONSTRAINT folha_pagamento_colaborador_id_fkey;
ALTER TABLE public.folha_pagamento ADD CONSTRAINT folha_pagamento_colaborador_id_fkey
  FOREIGN KEY (colaborador_id) REFERENCES public.entidades(id);

ALTER TABLE public.beneficios_vinculados DROP CONSTRAINT beneficios_vinculados_colaborador_id_fkey;
ALTER TABLE public.beneficios_vinculados ADD CONSTRAINT beneficios_vinculados_colaborador_id_fkey
  FOREIGN KEY (colaborador_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

ALTER TABLE public.registros_ponto DROP CONSTRAINT registros_ponto_colaborador_id_fkey;
ALTER TABLE public.registros_ponto ADD CONSTRAINT registros_ponto_colaborador_id_fkey
  FOREIGN KEY (colaborador_id) REFERENCES public.entidades(id);

ALTER TABLE public.departamentos DROP CONSTRAINT fk_departamentos_responsavel;
ALTER TABLE public.departamentos ADD CONSTRAINT fk_departamentos_responsavel
  FOREIGN KEY (responsavel_id) REFERENCES public.entidades(id) ON DELETE SET NULL;

-- 5) usuarios: remove colaborador_id/socio_id/pessoa_tipo/constraint XOR antiga
-- (entidade_id + trg_validar_usuario_pessoa_papel, da Fase 1, assume o papel)
ALTER TABLE public.usuarios DROP CONSTRAINT usuarios_pessoa_xor_chk;
DROP INDEX IF EXISTS public.uq_usuarios_colaborador;
DROP INDEX IF EXISTS public.uq_usuarios_socio;
DROP INDEX IF EXISTS public.idx_usuarios_colaborador;
DROP INDEX IF EXISTS public.idx_usuarios_socio;
ALTER TABLE public.usuarios
  DROP COLUMN colaborador_id,
  DROP COLUMN socio_id,
  DROP COLUMN pessoa_tipo;

-- 6) Corte seco: tabelas legadas fora
DROP TABLE public.colaboradores;
DROP TABLE public.socios_representantes;
