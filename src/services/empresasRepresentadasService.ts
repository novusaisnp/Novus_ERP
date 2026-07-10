import { supabase as _supabase } from '@/integrations/supabase/client';
import type { EmpresaRepresentada } from '@/hooks/useEmpresasRepresentadas';

const supabase: any = _supabase;

// Colunas reais da tabela empresas_representadas
const REAL_COLUMNS = [
  'nome', 'cnpj', 'email', 'telefone', 'endereco',
  'cidade', 'estado', 'cep', 'ativo',
] as const;

function buildPayload(input: EmpresaRepresentada & Record<string, any>) {
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
    cidade: input.cidade || null,
    estado: input.estado || null,
    cep: input.cep || null,
    ativo: input.ativo ?? true,
    configuracoes,
    updated_at: new Date().toISOString(),
  };
}

function hydrate(row: any): EmpresaRepresentada {
  if (!row) return row;
  const c = (row.configuracoes && typeof row.configuracoes === 'object') ? row.configuracoes : {};
  return { ...c, ...row, configuracoes: c };
}

export const empresasRepresentadasService = {
  async list(): Promise<EmpresaRepresentada[]> {
    const { data, error } = await supabase
      .from('empresas_representadas')
      .select('*')
      .order('nome');
    if (error) throw error;
    return (data || []).map(hydrate);
  },

  async save(input: EmpresaRepresentada): Promise<EmpresaRepresentada> {
    const payload = buildPayload(input);
    if (input.id) {
      const { data, error } = await supabase
        .from('empresas_representadas')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    } else {
      const { data, error } = await supabase
        .from('empresas_representadas')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return hydrate(data);
    }
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('empresas_representadas').delete().eq('id', id);
    if (error) throw error;
  },
};
