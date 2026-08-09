
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cargo } from '@/types/rh';
import { cargoService } from '@/services/cargoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'cargos';

export const useCargos = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cargos = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const data = await cargoService.fetchCargos();
      return data.map(rhUtils.transformSupabaseToCargo);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const saveCargo = async (cargoData: Cargo) => {
    if (!cargoData.nome?.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Nome do cargo é obrigatório.",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (cargoData.id) {
        await cargoService.updateCargo(cargoData.id, cargoData);
      } else {
        await cargoService.createCargo(cargoData);
      }
      await invalidate();
      return true;
    } catch (error) {
      console.error('[Cargos] Erro ao salvar cargo:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteCargo = async (id: string) => {
    try {
      await cargoService.deleteCargo(id);
      await invalidate();
      toast({
        title: "Sucesso",
        description: "Cargo excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[Cargos] Erro ao excluir cargo:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    cargos,
    loading,
    saveCargo,
    deleteCargo,
    refetch: invalidate
  };
};
