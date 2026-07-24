import { supabase } from '@/integrations/supabase/client';
import { Venda, ItemVenda, VendaFiltros } from '@/types/vendas';


async function getEmpresaId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error || !data) throw new Error('Empresa do usuário não localizada.');
  return data as string;
}

function calcTotais(v: Partial<Venda>): Partial<Venda> {
  const itens = v.itens || [];
  const subtotal = itens.reduce((acc, it) => {
    const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
    const liq = bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
    return acc + liq;
  }, 0);
  const valor_total =
    subtotal - (Number(v.desconto) || 0) + (Number(v.acrescimo) || 0) + (Number(v.valor_frete) || 0);
  return { ...v, subtotal, valor_total };
}

export const vendasService = {
  calcTotais,

  async list(filtros: VendaFiltros = {}): Promise<Venda[]> {
    let q = supabase
      .from('vendas')
      .select('*, cliente:clientes(id, nome), itens:itens_venda(*)')
      .is('deleted_at', null)
      .order('data_venda', { ascending: false });

    if (filtros.status) q = q.eq('status', filtros.status);
    if (filtros.data_inicio) q = q.gte('data_venda', filtros.data_inicio);
    if (filtros.data_fim) q = q.lte('data_venda', filtros.data_fim);
    if (filtros.busca) q = q.ilike('numero_venda', `%${filtros.busca}%`);

    const { data, error } = await q;
    if (error) {
      console.error('[vendasService] Erro ao listar vendas');
      throw error;
    }
    return (data || []) as Venda[];
  },

  async save(venda: Venda): Promise<Venda> {
    const empresaId = venda.empresa_representada_id || (await getEmpresaId());
    const withTotals = calcTotais({ ...venda, empresa_representada_id: empresaId });

    const { itens, cliente, ...rest } = withTotals as any;

    let vendaId = venda.id;
    if (vendaId) {
      const { error } = await supabase
        .from('vendas')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', vendaId);
      if (error) {
        console.error('[vendasService] Erro ao atualizar venda');
        throw error;
      }
    } else {
      const { data, error } = await supabase.from('vendas').insert(rest).select('id').single();
      if (error) {
        console.error('[vendasService] Erro ao criar venda');
        throw error;
      }
      vendaId = data.id;
    }

    // Substitui itens
    const { error: delErr } = await supabase.from('itens_venda').delete().eq('venda_id', vendaId);
    if (delErr) {
      console.error('[vendasService] Erro ao limpar itens');
      throw delErr;
    }

    const itensList: ItemVenda[] = itens || [];
    if (itensList.length > 0) {
      const rows = itensList.map((it, idx) => {
        const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
        const total = bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
        return {
          venda_id: vendaId,
          empresa_representada_id: empresaId,
          produto_id: it.produto_id || null,
          servico_id: it.servico_id || null,
          descricao: it.descricao,
          quantidade: it.quantidade,
          unidade: it.unidade || null,
          preco_unitario: it.preco_unitario,
          desconto_item: it.desconto_item || 0,
          acrescimo_item: it.acrescimo_item || 0,
          valor_total_item: total,
          ordem: it.ordem ?? idx,
          observacoes: it.observacoes || null,
        };
      });
      const { error: insErr } = await supabase.from('itens_venda').insert(rows);
      if (insErr) {
        console.error('[vendasService] Erro ao gravar itens');
        throw insErr;
      }
    }

    return { ...withTotals, id: vendaId } as Venda;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[vendasService] Erro ao excluir venda');
      throw error;
    }
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase
      .from('vendas')
      .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('[vendasService] Erro ao cancelar venda');
      throw error;
    }
  },
};
