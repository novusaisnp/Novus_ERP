
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { VencimentoPadrao } from '@/types/rh';
import { vencimentoPadraoService } from '@/services/vencimentoPadraoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'vencimentos-padrao';

export const useVencimentosPadrao = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: vencimentos = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const data = await vencimentoPadraoService.fetchVencimentos();
      return data.map(rhUtils.transformSupabaseToVencimentoPadrao);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const saveVencimento = async (vencimentoData: VencimentoPadrao) => {
    if (!vencimentoData.codigo?.trim() || !vencimentoData.descricao?.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Código e descrição são obrigatórios.",
        variant: "destructive",
      });
      return false;
    }

    try {
      if (vencimentoData.id) {
        await vencimentoPadraoService.updateVencimento(vencimentoData.id, vencimentoData);
      } else {
        await vencimentoPadraoService.createVencimento(vencimentoData);
      }
      await invalidate();
      toast({
        title: "Sucesso",
        description: vencimentoData.id ? "Vencimento atualizado com sucesso!" : "Vencimento cadastrado com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[VencimentosPadrao] Erro ao salvar vencimento:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteVencimento = async (id: string) => {
    try {
      await vencimentoPadraoService.deleteVencimento(id);
      await invalidate();
      toast({
        title: "Sucesso",
        description: "Vencimento excluído com sucesso!",
      });
      return true;
    } catch (error) {
      console.error('[VencimentosPadrao] Erro ao excluir vencimento:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    vencimentos,
    loading,
    saveVencimento,
    deleteVencimento,
    refetch: invalidate
  };
};
