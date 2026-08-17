import { supabase } from '@/integrations/supabase/client';
import { Venda, ItemVenda, VendaFiltros } from '@/types/vendas';
import { estoqueService } from '@/services/estoque/estoqueService';
import { localizacaoService } from '@/services/localizacaoService';
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
      // vendas.tipo é NOT NULL (CHECK IN ('P','S','H')) mas o formulário não
      // expõe esse campo — mesmo fallback usado por converter_orcamento_em_venda.
      const { data, error } = await supabase
        .from('vendas')
        .insert({ tipo: 'P', ...rest })
        .select('id')
        .single();
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
          tipo_item: it.servico_id ? 'S' : 'P',
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

    // Baixa de estoque real (best-effort): não bloqueia o salvamento da venda
    // se falhar — idempotente no banco (1 baixa por venda+produto), então é
    // seguro chamar a cada save enquanto a venda não estiver RASCUNHO/CANCELADO.
    if (withTotals.status && withTotals.status !== 'RASCUNHO' && withTotals.status !== 'CANCELADO') {
      try {
        // Localização escolhida no formulário (AUDITORIA_NOVA Fase 3: antes
        // sempre usava a primeira localização retornada pela query, não uma
        // escolhida pelo usuário). Sem escolha explícita, cai no comportamento
        // antigo como fallback — mantém vendas programáticas funcionando.
        let localizacaoId = (withTotals as Venda).localizacao_estoque_id;
        if (!localizacaoId) {
          const locais = await localizacaoService.getAll();
          localizacaoId = locais[0]?.id;
        }
        if (localizacaoId) {
          await estoqueService.baixarEstoqueVenda(vendaId, localizacaoId);
        }
      } catch (e) {
        console.error('[vendasService] Erro ao baixar estoque da venda', e);
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
    try {
      await estoqueService.estornarEstoqueVenda(id);
    } catch (e) {
      console.error('[vendasService] Erro ao estornar estoque da venda', e);
    }
  },
};
