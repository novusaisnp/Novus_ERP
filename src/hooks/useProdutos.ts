
import { useState, useEffect } from 'react';
import { produtoService, type Paginacao } from '@/services/produtoService';
import { produtoUtils } from '@/utils/produtoUtils';
import { Produto, SupabaseProduto } from '@/types/produto';
import { useToast } from '@/hooks/use-toast';

export const useProdutos = (busca = '', paginacao?: Paginacao) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Debounce da busca — mesmo padrão de useContaContabilSearch.ts (300ms).
  const [debouncedBusca, setDebouncedBusca] = useState(busca);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBusca(busca), 300);
    return () => clearTimeout(timer);
  }, [busca]);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, total: totalRows } = await produtoService.listar({ busca: debouncedBusca, paginacao });
      const produtosTransformados = data.map(produtoUtils.transformSupabaseToProduto);

      setProdutos(produtosTransformados);
      setTotal(totalRows);
    } catch (err) {
      console.error('[useProdutos] Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const criarProduto = async (produto: Produto): Promise<boolean> => {
    try {
      
      const validation = produtoUtils.validarProduto(produto);
      if (!validation.isValid) {
        toast({
          title: "Dados inválidos",
          description: validation.errors.join(', '),
          variant: "destructive",
        });
        return false;
      }

      await produtoService.criar(produto);
      
      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso!",
      });
      
      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('[useProdutos] Erro ao criar produto:', err);
      const errorMessage = produtoUtils.getErrorMessage(err as { code?: string; message?: string });
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const atualizarProduto = async (id: string, produto: Produto): Promise<boolean> => {
    try {
      
      const validation = produtoUtils.validarProduto(produto);
      if (!validation.isValid) {
        toast({
          title: "Dados inválidos",
          description: validation.errors.join(', '),
          variant: "destructive",
        });
        return false;
      }

      await produtoService.atualizar(id, produto);
      
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      });
      
      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('[useProdutos] Erro ao atualizar produto:', err);
      const errorMessage = produtoUtils.getErrorMessage(err as { code?: string; message?: string });
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const excluirProduto = async (id: string): Promise<boolean> => {
    try {
      
      await produtoService.excluir(id);
      
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      });
      
      await fetchProdutos();
      return true;
    } catch (err) {
      console.error('[useProdutos] Erro ao excluir produto:', err);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive",
      });
      return false;
    }
  };

  const buscarPorCodigoBarras = async (codigoBarras: string): Promise<Produto | null> => {
    try {
      
      const data = await produtoService.buscarPorCodigoBarras(codigoBarras);
      if (!data) return null;
      
      return produtoUtils.transformSupabaseToProduto(data);
    } catch (err) {
      console.error('[useProdutos] Erro ao buscar por código de barras:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedBusca, paginacao?.page, paginacao?.pageSize]);

  return {
    produtos,
    total,
    loading,
    error,
    fetchProdutos,
    criarProduto,
    atualizarProduto,
    excluirProduto,
    buscarPorCodigoBarras,
  };
};
