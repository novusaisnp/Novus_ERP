import { supabase } from '@/integrations/supabase/client';
import type { SocioRepresentante } from '@/types/socios';


export const sociosRepresentantesService = {
  async listByEmpresa(empresaId: string): Promise<SocioRepresentante[]> {
    const { data, error } = await supabase
      .from('socios_representantes')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('nome');
    if (error) throw error;
    return (data || []) as unknown as SocioRepresentante[];
  },

  async listAvailableForUser(empresaId: string): Promise<SocioRepresentante[]> {
    const { data: socios, error } = await supabase
      .from('socios_representantes')
      .select('*')
      .eq('empresa_representada_id', empresaId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .order('nome');
    if (error) throw error;
    const { data: linked } = await supabase
      .from('usuarios')
      .select('socio_id')
      .not('socio_id', 'is', null);
    const usedIds = new Set((linked || []).map((u: any) => u.socio_id));
    return ((socios || []).filter((s: any) => !usedIds.has(s.id))) as unknown as SocioRepresentante[];
  },

  async save(input: SocioRepresentante): Promise<SocioRepresentante> {
    const payload = {
      empresa_representada_id: input.empresa_representada_id,
      nome: input.nome,
      cpf: input.cpf || null,
      email: input.email || null,
      telefone: input.telefone || null,
      tipo: input.tipo,
      participacao_percentual: input.participacao_percentual ?? null,
      cargo_societario: input.cargo_societario || null,
      documento_url: input.documento_url || null,
      ativo: input.ativo ?? true,
      updated_at: new Date().toISOString(),
    };
    if (input.id) {
      const { data, error } = await supabase
        .from('socios_representantes')
        .update(payload)
        .eq('id', input.id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as SocioRepresentante;
    }
    const { data, error } = await supabase
      .from('socios_representantes')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data as unknown as SocioRepresentante;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('socios_representantes')
      .update({ deleted_at: new Date().toISOString(), ativo: false })
      .eq('id', id);
    if (error) throw error;
  },
};
