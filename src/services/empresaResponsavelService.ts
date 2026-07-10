import { supabase as _supabase } from '@/integrations/supabase/client';
import type { EmpresaResponsavel } from '@/hooks/useEmpresaResponsavel';

const supabase: any = _supabase;

// Colunas reais da tabela empresa_responsavel
const REAL_COLUMNS = ['nome', 'cnpj', 'email', 'telefone', 'endereco', 'logo_url'] as const;

/**
 * Monta o payload separando colunas reais das que devem ir para o jsonb `configuracoes`.
 * Qualquer campo não listado em REAL_COLUMNS é preservado dentro de configuracoes.
 */
function buildPayload(input: EmpresaResponsavel & Record<string, any>) {
  const incomingConfig =
    input.configuracoes && typeof input.configuracoes === 'object'
      ? { ...(input.configuracoes as Record<string, any>) }
      : {};

  const extras: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === 'id' || k === 'configuracoes' || k === 'created_at' || k === 'updated_at') continue;
    if ((REAL_COLUMNS as readonly string[]).includes(k)) continue;
    extras[k] = v;
  }

  const configuracoes = { ...incomingConfig, ...extras };

  return {
    nome: input.nome,
    cnpj: input.cnpj || null,
    email: input.email || null,
    telefone: input.telefone || null,
    endereco: input.endereco || null,
    logo_url: input.logo_url || null,
    configuracoes,
    updated_at: new Date().toISOString(),
  };
}

/** Achata `configuracoes` sobre o objeto principal para o formulário. */
function hydrate(row: any): EmpresaResponsavel {
  if (!row) return row;
  const c = (row.configuracoes && typeof row.configuracoes === 'object') ? row.configuracoes : {};
  return { ...c, ...row, configuracoes: c };
}

export const empresaResponsavelService = {
  async fetch(): Promise<EmpresaResponsavel | null> {
    const { data, error } = await supabase.from('empresa_responsavel').select('*').maybeSingle();
    if (error) throw error;
    return data ? hydrate(data) : null;
  },

  async save(input: EmpresaResponsavel): Promise<void> {
    const payload = buildPayload(input);
    if (input.id) {
      const { error } = await supabase.from('empresa_responsavel').update(payload).eq('id', input.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('empresa_responsavel').insert(payload);
      if (error) throw error;
    }
  },
};
