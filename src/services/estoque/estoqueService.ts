// P12: Camada de serviços para o Módulo de Estoque
import { supabase } from '@/integrations/supabase/client';
import type {
  EstoqueMovimentacao,
  EstoqueMovimentacaoTipo,
  EstoqueInventario,
  EstoqueInventarioItem,
  EstoqueSaldo,
} from '@/types/estoque';

export interface NovaMovimentacaoInput {
  empresa_representada_id: string;
  produto_id: string;
  tipo: EstoqueMovimentacaoTipo;
  quantidade: number;
  custo_unitario?: number;
  localizacao_origem_id?: string | null;
  localizacao_destino_id?: string | null;
  documento_ref?: string | null;
  observacoes?: string | null;
}

export interface ProdutoBasico {
  id: string;
  nome: string;
  codigo: string | null;
}

export interface LocalizacaoEstoque {
  id: string;
  nome: string;
}

export const estoqueService = {
  // -------------------- Lookups (produtos/localizações) --------------------
  async listLocalizacoes(empresa_id: string, opts?: { apenasAtivas?: boolean }): Promise<LocalizacaoEstoque[]> {
    let q = supabase
      .from('localizacoes_estoque')
      .select('id, nome')
      .eq('empresa_representada_id', empresa_id);
    if (opts?.apenasAtivas) q = q.eq('ativo', true);
    const { data, error } = await q.order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async listProdutosParaSelecao(empresa_id: string, opts?: { apenasAtivos?: boolean }): Promise<ProdutoBasico[]> {
    let q = supabase
      .from('produtos')
      .select('id, nome, codigo')
      .eq('empresa_representada_id', empresa_id)
      .is('deleted_at', null);
    if (opts?.apenasAtivos) q = q.eq('ativo', true);
    const { data, error } = await q.order('nome');
    if (error) throw error;
    return data ?? [];
  },

  async getProdutoBasico(produto_id: string): Promise<ProdutoBasico | null> {
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome, codigo')
      .eq('id', produto_id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getProdutosBasicoPorIds(ids: string[]): Promise<ProdutoBasico[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('produtos')
      .select('id, nome, codigo')
      .in('id', ids);
    if (error) throw error;
    return data ?? [];
  },

  async getInventarioById(inventario_id: string): Promise<EstoqueInventario | null> {
    const { data, error } = await supabase
      .from('estoque_inventarios')
      .select('*')
      .eq('id', inventario_id)
      .maybeSingle();
    if (error) throw error;
    return data as EstoqueInventario | null;
  },

  async listMovimentacoes(filtros?: {
    empresa_id?: string;
    produto_id?: string;
    tipo?: EstoqueMovimentacaoTipo;
    from?: string;
    to?: string;
  }): Promise<EstoqueMovimentacao[]> {
    let q = supabase
      .from('estoque_movimentacoes')
      .select('*')
      .is('deleted_at', null)
      .order('data_movimento', { ascending: false })
      .limit(500);
    if (filtros?.empresa_id) q = q.eq('empresa_representada_id', filtros.empresa_id);
    if (filtros?.produto_id) q = q.eq('produto_id', filtros.produto_id);
    if (filtros?.tipo) q = q.eq('tipo', filtros.tipo);
    if (filtros?.from) q = q.gte('data_movimento', filtros.from);
    if (filtros?.to) q = q.lte('data_movimento', filtros.to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as EstoqueMovimentacao[];
  },

  async criarMovimentacao(input: NovaMovimentacaoInput): Promise<EstoqueMovimentacao> {
    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as EstoqueMovimentacao;
  },

  async validarSaldo(produto_id: string, localizacao_id: string, quantidade: number) {
    const { data, error } = await supabase.rpc('validar_saldo_estoque', {
      p_produto: produto_id,
      p_localizacao: localizacao_id,
      p_quantidade: quantidade,
    });
    if (error) throw error;
    return data as { ok: boolean; saldo_atual: number; quantidade_solicitada: number };
  },

  async listSaldos(empresa_id: string): Promise<EstoqueSaldo[]> {
    const { data, error } = await supabase
      .from('estoque_saldos')
      .select('*')
      .eq('empresa_representada_id', empresa_id);
    if (error) throw error;
    return (data ?? []) as EstoqueSaldo[];
  },

  async listInventarios(empresa_id: string): Promise<EstoqueInventario[]> {
    const { data, error } = await supabase
      .from('estoque_inventarios')
      .select('*')
      .eq('empresa_representada_id', empresa_id)
      .is('deleted_at', null)
      .order('data_inicio', { ascending: false });
    if (error) throw error;
    return (data ?? []) as EstoqueInventario[];
  },

  async criarInventario(input: {
    empresa_representada_id: string;
    codigo: string;
    localizacao_id: string;
    observacoes?: string | null;
  }): Promise<EstoqueInventario> {
    const { data, error } = await supabase
      .from('estoque_inventarios')
      .insert({ ...input, status: 'EM_CONTAGEM' })
      .select()
      .single();
    if (error) throw error;

    // Popular itens a partir dos saldos da localização
    const { data: saldos } = await supabase
      .from('estoque_saldos')
      .select('produto_id, quantidade, custo_medio')
      .eq('empresa_representada_id', input.empresa_representada_id)
      .eq('localizacao_id', input.localizacao_id);

    if (saldos && saldos.length > 0) {
      const itens = saldos.map((s) => ({
        empresa_representada_id: input.empresa_representada_id,
        inventario_id: data.id,
        produto_id: s.produto_id,
        saldo_sistema: s.quantidade,
        saldo_contado: s.quantidade,
        custo_unitario: s.custo_medio,
      }));
      await supabase.from('estoque_inventario_itens').insert(itens);
    }

    return data as EstoqueInventario;
  },

  async listInventarioItens(inventario_id: string): Promise<EstoqueInventarioItem[]> {
    const { data, error } = await supabase
      .from('estoque_inventario_itens')
      .select('*')
      .eq('inventario_id', inventario_id)
      .order('created_at');
    if (error) throw error;
    return (data ?? []) as EstoqueInventarioItem[];
  },

  async atualizarContagem(item_id: string, saldo_contado: number): Promise<void> {
    const { error } = await supabase
      .from('estoque_inventario_itens')
      .update({ saldo_contado })
      .eq('id', item_id);
    if (error) throw error;
  },

  async conciliarInventario(inventario_id: string) {
    const { data, error } = await supabase.rpc('conciliar_inventario', {
      p_inventario_id: inventario_id,
    });
    if (error) throw error;
    return data as { ok: boolean; gerados: number; replay: boolean };
  },

  async cancelarInventario(inventario_id: string): Promise<void> {
    const { error } = await supabase
      .from('estoque_inventarios')
      .update({ status: 'CANCELADO', data_fim: new Date().toISOString() })
      .eq('id', inventario_id);
    if (error) throw error;
  },
};
