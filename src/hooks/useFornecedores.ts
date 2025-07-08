
import { useState, useEffect } from 'react';
import { Fornecedor } from '@/types/fornecedor';
import { fornecedorService } from '@/services/fornecedorService';
import { fornecedorUtils } from '@/utils/fornecedorUtils';
import { useToast } from '@/hooks/use-toast';

export const useFornecedores = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleError = (error: any, defaultMessage: string) => {
    console.error('[useFornecedores] Erro:', error);
    const errorMessage = fornecedorUtils.getErrorMessage(error);
    toast({
      title: "Erro",
      description: errorMessage || defaultMessage,
      variant: "destructive"
    });
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "Sucesso",
      description: message,
    });
  };

  const loadFornecedores = async () => {
    setLoading(true);
    try {
      console.log('[useFornecedores] Carregando fornecedores...');
      const data = await fornecedorService.fetchFornecedores();
      const fornecedoresFormatados = data.map(fornecedorUtils.transformSupabaseToFornecedor);
      console.log('[useFornecedores] Fornecedores carregados:', fornecedoresFormatados.length);
      setFornecedores(fornecedoresFormatados);
    } catch (error) {
      handleError(error, "Erro inesperado ao carregar os fornecedores.");
    } finally {
      setLoading(false);
    }
  };

  const saveFornecedor = async (fornecedorData: Fornecedor) => {
    setLoading(true);
    try {
      console.log('[useFornecedores] Salvando fornecedor:', fornecedorData.tipo_pessoa, fornecedorData.id ? 'UPDATE' : 'CREATE');
      
      const validation = fornecedorUtils.validateFornecedor(fornecedorData);
      if (!validation.isValid) {
        console.log('[useFornecedores] Validação falhou:', validation.error);
        toast({
          title: "Erro de validação",
          description: validation.error!,
          variant: "destructive"
        });
        setLoading(false);
        return false;
      }

      if (fornecedorData.id) {
        await fornecedorService.updateFornecedor(fornecedorData.id, fornecedorData);
        handleSuccess("Fornecedor atualizado com sucesso!");
      } else {
        await fornecedorService.createFornecedor(fornecedorData);
        handleSuccess("Fornecedor criado com sucesso!");
      }

      await loadFornecedores();
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao salvar os dados.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteFornecedor = async (id: string) => {
    if (!id) {
      toast({
        title: "Erro de validação",
        description: "ID do fornecedor é obrigatório para exclusão.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('[useFornecedores] Excluindo fornecedor:', id);
      await fornecedorService.deleteFornecedor(id);
      await loadFornecedores();
      handleSuccess("Fornecedor excluído com sucesso!");
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao excluir os dados.");
      return false;
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, []);

  return {
    fornecedores,
    loading,
    saveFornecedor,
    deleteFornecedor,
    refetch: loadFornecedores
  };
};
