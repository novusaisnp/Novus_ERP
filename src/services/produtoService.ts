
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { Produto, SupabaseProduto } from '@/types/produto';
import { getEmpresaAtivaIdOuFalha as getEmpresaId } from '@/lib/empresaAtiva';

type ProdutoInsert = Database['public']['Tables']['produtos']['Insert'];
type ProdutoUpdate = Database['public']['Tables']['produtos']['Update'];

export interface Paginacao {
  page: number; // 0-based
  pageSize: number;
}

export interface ListarProdutosOpts {
  busca?: string;
  paginacao?: Paginacao;
}

export const produtoService = {
  async listar(opts: ListarProdutosOpts = {}): Promise<{ data: SupabaseProduto[]; total: number }> {
    const { busca, paginacao } = opts;
    const empresaId = await getEmpresaId();
    let query = supabase
      .from('produtos')
      .select('*', { count: paginacao ? 'exact' : undefined })
      .eq('empresa_representada_id', empresaId)
      .order('created_at', { ascending: false });

    if (busca?.trim()) {
      const termo = busca.trim().replace(/[,()]/g, '');
      query = query.or(`nome.ilike.%${termo}%,codigo.ilike.%${termo}%,ncm.ilike.%${termo}%`);
    }

    if (paginacao) {
      const from = paginacao.page * paginacao.pageSize;
      const to = from + paginacao.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Produtos] Erro ao listar produtos:', error);
      throw error;
    }

    const rows = (data || []) as unknown as SupabaseProduto[];
    return { data: rows, total: paginacao ? (count ?? 0) : rows.length };
  },

  async buscarPorId(id: string): Promise<SupabaseProduto | null> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();

    if (error) {
      console.error('[Produtos] Erro ao buscar produto:', error);
      throw error;
    }

    return data as unknown as SupabaseProduto | null;
  },

  async criar(produto: Produto): Promise<SupabaseProduto> {
    const empresa_representada_id = await getEmpresaId();
    const payload: ProdutoInsert = {
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
      origem_produto: produto.origem_produto || '0',
      dados_fiscais: produto.dados_fiscais as unknown as Json,
      estoque_atual: produto.estoque_atual ?? 0,
      estoque_minimo: produto.estoque_minimo ?? 0,
      ativo: produto.ativo !== false,
    };
    const { data, error } = await supabase
      .from('produtos')
      .insert(payload as ProdutoInsert)
      .select()
      .single();

    if (error) {
      console.error('[Produtos] Erro ao criar produto:', error);
      throw error;
    }

    return data as unknown as SupabaseProduto;
  },

  async atualizar(id: string, produto: Produto): Promise<SupabaseProduto> {
    const empresaId = await getEmpresaId();
    const payload: ProdutoUpdate = {
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
      origem_produto: produto.origem_produto || '0',
      dados_fiscais: produto.dados_fiscais as unknown as Json,
      estoque_atual: produto.estoque_atual ?? 0,
      estoque_minimo: produto.estoque_minimo ?? 0,
      ativo: produto.ativo !== false,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('produtos')
      .update(payload as ProdutoUpdate)
      .eq('id', id)
      .eq('empresa_representada_id', empresaId)
      .select()
      .single();

    if (error) {
      console.error('[Produtos] Erro ao atualizar produto:', error);
      throw error;
    }

    return data as unknown as SupabaseProduto;
  },

  async excluir(id: string): Promise<void> {
    const empresaId = await getEmpresaId();
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id)
      .eq('empresa_representada_id', empresaId);

    if (error) {
      console.error('[Produtos] Erro ao excluir produto:', error);
      throw error;
    }

  },

  async buscarPorCodigoBarras(codigoBarras: string): Promise<SupabaseProduto | null> {
    const empresaId = await getEmpresaId();
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .eq('codigo', codigoBarras)
      .eq('empresa_representada_id', empresaId)
      .maybeSingle();

    if (error) {
      console.error('[Produtos] Erro ao buscar produto por código de barras:', error);
      throw error;
    }

    return data as unknown as SupabaseProduto | null;
  }
};
