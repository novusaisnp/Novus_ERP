
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colaborador } from '@/types/rh';
import { colaboradorService } from '@/services/colaboradorService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'colaboradores';

export const useColaboradores = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: colaboradores = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const data = await colaboradorService.fetchColaboradores();
      return (data as any[]).map(rhUtils.transformSupabaseToColaborador);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const saveColaborador = async (colaboradorData: Colaborador) => {
    const validation = rhUtils.validateColaboradorData(colaboradorData);
    if (!validation.isValid) {
      toast({
        title: "Erro de Validação",
        description: validation.error,
        variant: "destructive",
      });
      return false;
    }

    try {
      if (colaboradorData.id) {
        await colaboradorService.updateColaborador(colaboradorData.id, colaboradorData);
        toast({
          title: "Sucesso",
          description: "Colaborador atualizado com sucesso!",
        });
      } else {
        await colaboradorService.createColaborador(colaboradorData);
        toast({
          title: "Sucesso",
          description: "Colaborador criado com sucesso!",
        });
      }
      await invalidate();
      return true;
    } catch (error) {
      console.error('[RH] Erro ao salvar colaborador:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteColaborador = async (id: string) => {
    if (!id) {
      toast({
        title: "Erro",
        description: "ID do colaborador é obrigatório para exclusão.",
        variant: "destructive",
      });
      return false;
    }

    try {
      await colaboradorService.deleteColaborador(id);
      await invalidate();
      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[RH] Erro ao excluir colaborador:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    colaboradores,
    loading,
    saveColaborador,
    deleteColaborador,
    refetch: invalidate
  };
};
