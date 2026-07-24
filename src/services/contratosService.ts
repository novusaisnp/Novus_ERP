import { supabase } from '@/integrations/supabase/client';
import { Contrato, ContratoFiltros } from '@/types/contratos';


async function getEmpresaId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error || !data) throw new Error('Empresa do usuário não localizada.');
  return data as string;
}

export const contratosService = {
  async list(filtros: ContratoFiltros = {}): Promise<Contrato[]> {
    let q = supabase
      .from('contratos')
      .select('*, cliente:clientes(id, nome)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filtros.status) q = q.eq('status', filtros.status);
    if (filtros.cliente_id) q = q.eq('cliente_id', filtros.cliente_id);
    if (filtros.busca) q = q.ilike('titulo', `%${filtros.busca}%`);

    const { data, error } = await q;
    if (error) {
      console.error('[contratosService] Erro ao listar contratos');
      throw error;
    }
    return (data || []) as Contrato[];
  },

  async save(contrato: Contrato): Promise<Contrato> {
    const empresaId = contrato.empresa_representada_id || (await getEmpresaId());
    const { cliente, id, ...rest } = contrato as any;
    const payload = { ...rest, empresa_representada_id: empresaId };

    if (id) {
      const { data, error } = await supabase
        .from('contratos')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.error('[contratosService] Erro ao atualizar contrato');
        throw error;
      }
      return data as Contrato;
    }

    const { data, error } = await supabase.from('contratos').insert(payload).select().single();
    if (error) {
      console.error('[contratosService] Erro ao criar contrato');
      throw error;
    }
    return data as Contrato;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('contratos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[contratosService] Erro ao excluir contrato');
      throw error;
    }
  },
};
