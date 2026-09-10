import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { EmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';


// Colunas reais da tabela empresa_responsavel
const REAL_COLUMNS = ['nome', 'cnpj', 'email', 'telefone', 'endereco', 'logo_url'] as const;

/**
 * Monta o payload separando colunas reais das que devem ir para o jsonb `configuracoes`.
 * Qualquer campo não listado em REAL_COLUMNS é preservado dentro de configuracoes.
 */
function buildPayload(input: EmpresaResponsavel & Record<string, unknown>) {
  const incomingConfig =
    input.configuracoes && typeof input.configuracoes === 'object'
      ? { ...(input.configuracoes as Record<string, unknown>) }
      : {};

  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === 'id' || k === 'configuracoes' || k === 'created_at' || k === 'updated_at') continue;
    if ((REAL_COLUMNS as readonly string[]).includes(k)) continue;
    extras[k] = v;
  }

  const configuracoes = { ...incomingConfig, ...extras };

  const cnpjLimpo = input.cnpj ? String(input.cnpj).replace(/\D/g, '') : '';

  return {
    nome: input.nome,
    cnpj: cnpjLimpo || null,
    email: input.email || null,
    telefone: input.telefone || null,
    endereco: input.endereco || null,
    configuracoes: configuracoes as Json,
    updated_at: new Date().toISOString(),
  };
}

/** Achata `configuracoes` sobre o objeto principal para o formulário. */
function hydrate(row: Record<string, unknown> | null): EmpresaResponsavel {
  if (!row) return row as unknown as EmpresaResponsavel;
  const c = (row.configuracoes && typeof row.configuracoes === 'object') ? row.configuracoes : {};
  return { ...c, ...row, configuracoes: c } as unknown as EmpresaResponsavel;
}

// empresa_responsavel é escopada por empresa (empresa_representada_id) desde
// 2026-09-10 — nunca buscar/gravar sem filtrar pela empresa ativa, nem para
// novus_owner: ele só opera na empresa que escolheu no seletor por vez.
async function getExistingEmpresaId(empresaAtivaId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('empresa_responsavel')
    .select('id')
    .eq('empresa_representada_id', empresaAtivaId)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

export const empresaResponsavelService = {
  async fetch(): Promise<EmpresaResponsavel | null> {
    const empresaAtivaId = await getEmpresaAtivaIdOuFalha();
    const { data, error } = await supabase
      .from('empresa_responsavel')
      .select('*')
      .eq('empresa_representada_id', empresaAtivaId)
      .maybeSingle();
    if (error) throw error;
    return data ? hydrate(data) : null;
  },

  async save(input: EmpresaResponsavel): Promise<EmpresaResponsavel> {
    const empresaAtivaId = await getEmpresaAtivaIdOuFalha();
    const payload = { ...buildPayload(input), empresa_representada_id: empresaAtivaId };
    const id = input.id || await getExistingEmpresaId(empresaAtivaId);

    if (id) {
      const { data, error } = await supabase
        .from('empresa_responsavel')
        .update(payload)
        .eq('id', id)
        .eq('empresa_representada_id', empresaAtivaId)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    } else {
      const { data, error } = await supabase
        .from('empresa_responsavel')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    }
  },
};
