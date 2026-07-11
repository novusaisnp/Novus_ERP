
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { Produto, SupabaseProduto } from '@/types/produto';

export const produtoService = {
  async listar(): Promise<SupabaseProduto[]> {
    
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Produtos] Erro ao listar produtos:', error);
      throw error;
    }

    return data || [];
  },

  async buscarPorId(id: string): Promise<SupabaseProduto | null> {
    
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Produtos] Erro ao buscar produto:', error);
      throw error;
    }

    return data;
  },

  async criar(produto: Produto): Promise<SupabaseProduto> {
    
    const { data, error } = await supabase
      .from('produtos')
      .insert({
        nome: produto.nome,
        descricao: produto.descricao || null,
        codigo_barras: produto.codigo_barras || null,
        categoria: produto.categoria || null,
        categoria_id: produto.categoria_id || null,
        unidade_medida: produto.unidade_medida || 'UN',

        peso: produto.peso || null,
        altura: produto.altura || null,
        largura: produto.largura || null,
        comprimento: produto.comprimento || null,
        variacoes: produto.variacoes ? JSON.parse(JSON.stringify(produto.variacoes)) : [],
        preco_compra: produto.preco_compra || null,
        preco_venda: produto.preco_venda,
        margem_lucro: produto.margem_lucro || null,
        imagem: produto.imagem || null,
        ncm: produto.ncm || null,
        cst_csosn: produto.cst_csosn || null,
        cfop: produto.cfop || null,
        cest: produto.cest || null,
        ficha_tecnica: produto.ficha_tecnica || null,
        modo_preparo: produto.modo_preparo || null,
        codigo_delivery: produto.codigo_delivery || null,
        estoque_atual: produto.estoque_atual || 0,
        estoque_minimo: produto.estoque_minimo || 0,
        custo_total: produto.custo_total || null,
        ativo: produto.ativo !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Produtos] Erro ao criar produto:', error);
      throw error;
    }

    return data;
  },

  async atualizar(id: string, produto: Produto): Promise<SupabaseProduto> {
    
    const { data, error } = await supabase
      .from('produtos')
      .update({
        nome: produto.nome,
        descricao: produto.descricao || null,
        codigo_barras: produto.codigo_barras || null,
        categoria: produto.categoria || null,
        categoria_id: produto.categoria_id || null,

        unidade_medida: produto.unidade_medida || 'UN',
        peso: produto.peso || null,
        altura: produto.altura || null,
        largura: produto.largura || null,
        comprimento: produto.comprimento || null,
        variacoes: produto.variacoes ? JSON.parse(JSON.stringify(produto.variacoes)) : [],
        preco_compra: produto.preco_compra || null,
        preco_venda: produto.preco_venda,
        margem_lucro: produto.margem_lucro || null,
        imagem: produto.imagem || null,
        ncm: produto.ncm || null,
        cst_csosn: produto.cst_csosn || null,
        cfop: produto.cfop || null,
        cest: produto.cest || null,
        ficha_tecnica: produto.ficha_tecnica || null,
        modo_preparo: produto.modo_preparo || null,
        codigo_delivery: produto.codigo_delivery || null,
        estoque_atual: produto.estoque_atual || 0,
        estoque_minimo: produto.estoque_minimo || 0,
        custo_total: produto.custo_total || null,
        ativo: produto.ativo !== false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Produtos] Erro ao atualizar produto:', error);
      throw error;
    }

    return data;
  },

  async excluir(id: string): Promise<void> {
    
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Produtos] Erro ao excluir produto:', error);
      throw error;
    }

  },

  async buscarPorCodigoBarras(codigoBarras: string): Promise<SupabaseProduto | null> {
    
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('codigo_barras', codigoBarras)
      .maybeSingle();

    if (error) {
      console.error('[Produtos] Erro ao buscar produto por código de barras:', error);
      throw error;
    }

    return data;
  }
};
