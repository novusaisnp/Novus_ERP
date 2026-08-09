
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Departamento } from '@/types/rh';
import { departamentoService } from '@/services/departamentoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'departamentos';

export const useDepartamentos = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: departamentos = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const data = await departamentoService.fetchDepartamentos();
      return data.map(rhUtils.transformSupabaseToDepartamento);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const saveDepartamento = async (departamentoData: Departamento) => {
    if (!departamentoData.nome?.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Nome do departamento é obrigatório.",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (departamentoData.id) {
        await departamentoService.updateDepartamento(departamentoData.id, departamentoData);
      } else {
        await departamentoService.createDepartamento(departamentoData);
      }
      await invalidate();
      toast({
        title: "Sucesso!",
        description: departamentoData.id
          ? "Departamento atualizado com sucesso!"
          : "Departamento criado com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[RH] Erro ao salvar departamento:', error);
      let errorMessage = "Erro desconhecido ao salvar departamento.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string; details?: string };
        if (errorObj.message) errorMessage = errorObj.message;
        else if (errorObj.details) errorMessage = errorObj.details;
      }
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteDepartamento = async (id: string) => {
    try {
      await departamentoService.deleteDepartamento(id);
      await invalidate();
      toast({
        title: "Sucesso",
        description: "Departamento excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[RH] Erro ao excluir departamento:', error);
      let errorMessage = "Erro desconhecido ao excluir departamento.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as { message?: string; details?: string };
        if (errorObj.message) errorMessage = errorObj.message;
      }
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    departamentos,
    loading,
    saveDepartamento,
    deleteDepartamento,
    refetch: invalidate
  };
};
