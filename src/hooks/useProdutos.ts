
import { useState, useEffect } from 'react';
import { produtoService } from '@/services/produtoService';
import { produtoUtils } from '@/utils/produtoUtils';
import { Produto, SupabaseProduto } from '@/types/produto';
import { useToast } from '@/hooks/use-toast';

export const useProdutos = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await produtoService.listar();
      const produtosTransformados = data.map(produtoUtils.transformSupabaseToProduto);
      
      setProdutos(produtosTransformados);
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('[useProdutos] Erro ao criar produto:', err);
      const errorMessage = produtoUtils.getErrorMessage(err);
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
    } catch (err: any) {
      console.error('[useProdutos] Erro ao atualizar produto:', err);
      const errorMessage = produtoUtils.getErrorMessage(err);
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
    } catch (err: any) {
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
    } catch (err: any) {
      console.error('[useProdutos] Erro ao buscar por código de barras:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  return {
    produtos,
    loading,
    error,
    fetchProdutos,
    criarProduto,
    atualizarProduto,
    excluirProduto,
    buscarPorCodigoBarras,
  };
};
