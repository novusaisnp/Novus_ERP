import { supabase } from '@/integrations/supabase/client';
import { Venda, VendaFiltros } from '@/types/vendas';
import type { Json } from '@/integrations/supabase/types';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';

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

export interface Paginacao {
  page: number; // 0-based
  pageSize: number;
}

export const vendasService = {
  calcTotais,

  async list(filtros: VendaFiltros = {}, paginacao?: Paginacao): Promise<{ data: Venda[]; total: number }> {
    const empresaId = await getEmpresaId();
    let q = supabase
      .from('vendas')
      .select('*, cliente:entidades!vendas_cliente_id_fkey(id, nome), vendedor:usuarios(id, nome), itens:itens_venda(*)', {
        count: paginacao ? 'exact' : undefined,
      })
      .eq('empresa_representada_id', empresaId)
      .is('deleted_at', null)
      .order('data_venda', { ascending: false });

    if (filtros.status) q = q.eq('status', filtros.status);
    if (filtros.data_inicio) q = q.gte('data_venda', filtros.data_inicio);
    if (filtros.data_fim) q = q.lte('data_venda', filtros.data_fim);
    if (filtros.busca) q = q.ilike('numero_venda', `%${filtros.busca}%`);

    if (paginacao) {
      const from = paginacao.page * paginacao.pageSize;
      const to = from + paginacao.pageSize - 1;
      q = q.range(from, to);
    }

    const { data, error, count } = await q;
    if (error) {
      console.error('[vendasService] Erro ao listar vendas');
      throw error;
    }
    const rows = (data || []) as Venda[];
    return { data: rows, total: paginacao ? (count ?? 0) : rows.length };
  },

  async save(venda: Venda): Promise<Venda> {
    const { data, error } = await supabase.rpc('venda_salvar_atomica', {
      p_empresa_id: await getEmpresaId(),
      p_venda_id: venda.id,
      p_dados: venda as unknown as Json,
      p_itens: (venda.itens ?? []) as unknown as Json,
    });
    if (error) throw new Error(error.message);
    return data as unknown as Venda;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.rpc('venda_cancelar_atomica', {
      p_empresa_id: await getEmpresaId(), p_venda_id: id, p_excluir: true,
    });
    if (error) {
      console.error('[vendasService] Erro ao excluir venda');
      throw error;
    }
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase.rpc('venda_cancelar_atomica', {
      p_empresa_id: await getEmpresaId(), p_venda_id: id,
    });
    if (error) {
      console.error('[vendasService] Erro ao cancelar venda');
      throw error;
    }
  },
};
