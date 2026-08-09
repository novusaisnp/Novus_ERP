
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Fornecedor } from '@/types/fornecedor';
import { fornecedorService } from '@/services/fornecedorService';
import { fornecedorUtils } from '@/utils/fornecedorUtils';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'fornecedores';

export const useFornecedores = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: fornecedores = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      try {
        const data = await fornecedorService.fetchFornecedores();
        return data.map(fornecedorUtils.transformSupabaseToFornecedor);
      } catch (error) {
        console.error('[useFornecedores] Erro ao carregar fornecedores:', error);
        const errorMessage = fornecedorUtils.getErrorMessage(error);
        toast({
          title: "Erro",
          description: errorMessage || "Erro inesperado ao carregar os fornecedores.",
          variant: "destructive"
        });
        throw error;
      }
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

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

  const saveFornecedor = async (fornecedorData: Fornecedor) => {
    const validation = fornecedorUtils.validateFornecedor(fornecedorData);
    if (!validation.isValid) {
      toast({
        title: "Erro de validação",
        description: validation.error!,
        variant: "destructive"
      });
      return false;
    }

    try {
      if (fornecedorData.id) {
        await fornecedorService.updateFornecedor(fornecedorData.id, fornecedorData);
        handleSuccess("Fornecedor atualizado com sucesso!");
      } else {
        await fornecedorService.createFornecedor(fornecedorData);
        handleSuccess("Fornecedor criado com sucesso!");
      }
      await invalidate();
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao salvar os dados.");
      return false;
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
      await fornecedorService.deleteFornecedor(id);
      await invalidate();
      handleSuccess("Fornecedor excluído com sucesso!");
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao excluir os dados.");
      return false;
    }
  };

  return {
    fornecedores,
    loading,
    saveFornecedor,
    deleteFornecedor,
    refetch: invalidate
  };
};
