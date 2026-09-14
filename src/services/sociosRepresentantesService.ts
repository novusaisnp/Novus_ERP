import { supabase } from '@/integrations/supabase/client';
import type { SocioRepresentante } from '@/types/socios';

const PAPEIS_SOCIO = ['SOCIO', 'REPRESENTANTE_LEGAL', 'PROCURADOR'] as const;

// Achata entidades + entidade_papeis(1:1 por essa query, um papel por vez)
// num objeto compatível com o formato antigo de `socios_representantes`.
function flatten(row: {
  entidade_papeis: { papel: string; participacao_percentual: number | null; cargo_societario: string | null }[];
  [key: string]: unknown;
}): SocioRepresentante {
  const papel = row.entidade_papeis[0];
  const { entidade_papeis: _omit, ...entidade } = row;
  return {
    ...entidade,
    tipo: papel?.papel,
    participacao_percentual: papel?.participacao_percentual,
    cargo_societario: papel?.cargo_societario,
  } as unknown as SocioRepresentante;
}

export const sociosRepresentantesService = {
  async listByEmpresa(empresaId: string): Promise<SocioRepresentante[]> {
    const { data, error } = await supabase
      .from('entidades')
      .select('*, entidade_papeis!inner(papel, participacao_percentual, cargo_societario)')
      .eq('empresa_representada_id', empresaId)
      .in('entidade_papeis.papel', PAPEIS_SOCIO)
      .is('deleted_at', null)
      .order('nome');
    if (error) throw error;
    return (data || []).map(flatten);
  },

  async listAvailableForUser(empresaId: string): Promise<SocioRepresentante[]> {
    const { data: socios, error } = await supabase
      .from('entidades')
      .select('*, entidade_papeis!inner(papel, participacao_percentual, cargo_societario)')
      .eq('empresa_representada_id', empresaId)
      .in('entidade_papeis.papel', PAPEIS_SOCIO)
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome');
    if (error) throw error;
    const { data: linked } = await supabase
      .from('usuarios')
      .select('entidade_id')
      .eq('empresa_representada_id', empresaId)
      .not('entidade_id', 'is', null);
    const usedIds = new Set((linked || []).map((u) => u.entidade_id));
    return (socios || []).map(flatten).filter((s) => !usedIds.has(s.id));
  },

  async save(input: SocioRepresentante): Promise<SocioRepresentante> {
    const entidadePayload = {
      empresa_representada_id: input.empresa_representada_id,
      tipo_pessoa: 'PF',
      nome: input.nome,
      cpf: input.cpf || null,
      email: input.email || null,
      telefone: input.telefone || null,
      ativo: input.ativo ?? true,
      updated_at: new Date().toISOString(),
    };
    const papelPayload = {
      participacao_percentual: input.participacao_percentual ?? null,
      cargo_societario: input.cargo_societario || null,
    };

    if (input.id) {
      const { data: entidade, error } = await supabase
        .from('entidades')
        .update(entidadePayload)
        .eq('id', input.id)
        .eq('empresa_representada_id', input.empresa_representada_id)
        .select('*')
        .single();
      if (error) throw error;
      const { data: papel, error: papelError } = await supabase
        .from('entidade_papeis')
        .update({ papel: input.tipo, ...papelPayload })
        .eq('entidade_id', input.id)
        .eq('empresa_representada_id', input.empresa_representada_id)
        .select('papel, participacao_percentual, cargo_societario')
        .single();
      if (papelError) throw papelError;
      return flatten({ ...entidade, entidade_papeis: [papel] });
    }

    const { data: entidade, error } = await supabase
      .from('entidades')
      .insert(entidadePayload)
      .select('*')
      .single();
    if (error) throw error;
    const { data: papel, error: papelError } = await supabase
      .from('entidade_papeis')
      .insert({ entidade_id: entidade.id, empresa_representada_id: input.empresa_representada_id, papel: input.tipo, ...papelPayload })
      .select('papel, participacao_percentual, cargo_societario')
      .single();
    if (papelError) throw papelError;
    return flatten({ ...entidade, entidade_papeis: [papel] });
  },

  async softDelete(id: string, empresaId: string): Promise<void> {
    const { error } = await supabase
      .from('entidades')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);
    if (error) throw error;
  },
};
