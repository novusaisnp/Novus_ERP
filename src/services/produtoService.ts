
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { Produto, SupabaseProduto } from '@/types/produto';

async function getEmpresaId(): Promise<string> {
  const { data, error } = await supabase.rpc('get_user_empresa_id');
  if (error) {
    console.error('[Produtos] Erro ao obter empresa do usuário:', error);
    throw new Error('Não foi possível identificar a empresa do usuário logado');
  }
  if (!data) throw new Error('Usuário sem empresa vinculada.');
  return data as string;
}

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
    const empresa_representada_id = await getEmpresaId();
    const payload: Record<string, unknown> = {
      empresa_representada_id,
      nome: produto.nome,
      descricao: produto.descricao || null,
      codigo: produto.codigo ?? null,
      categoria_id: produto.categoria_id || null,
      peso: produto.peso ?? null,
      altura: produto.altura ?? null,
      largura: produto.largura ?? null,
      comprimento: produto.comprimento ?? null,
      preco_custo: produto.preco_custo ?? null,
      preco_venda: produto.preco_venda,
      margem_lucro: produto.margem_lucro ?? null,
      imagem_url: produto.imagem_url || null,
      ncm: produto.ncm || null,
      cest: produto.cest || null,
      estoque_atual: produto.estoque_atual ?? 0,
      estoque_minimo: produto.estoque_minimo ?? 0,
      ativo: produto.ativo !== false,
    };
    const { data, error } = await supabase
      .from('produtos')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[Produtos] Erro ao criar produto:', error);
      throw error;
    }

    return data;
  },

  async atualizar(id: string, produto: Produto): Promise<SupabaseProduto> {
    const payload: Record<string, unknown> = {
      nome: produto.nome,
      descricao: produto.descricao || null,
      codigo: produto.codigo ?? null,
      categoria_id: produto.categoria_id || null,
      peso: produto.peso ?? null,
      altura: produto.altura ?? null,
      largura: produto.largura ?? null,
      comprimento: produto.comprimento ?? null,
      preco_custo: produto.preco_custo ?? null,
      preco_venda: produto.preco_venda,
      margem_lucro: produto.margem_lucro ?? null,
      imagem_url: produto.imagem_url || null,
      ncm: produto.ncm || null,
      cest: produto.cest || null,
      estoque_atual: produto.estoque_atual ?? 0,
      estoque_minimo: produto.estoque_minimo ?? 0,
      ativo: produto.ativo !== false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('produtos')
      .update(payload)
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
