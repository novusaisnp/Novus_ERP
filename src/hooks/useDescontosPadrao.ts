
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DescontoPadrao } from '@/types/rh';
import { descontoPadraoService } from '@/services/descontoPadraoService';
import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = 'descontos-padrao';

const transformSupabaseToDescontoPadrao = (data: any): DescontoPadrao => {
  return {
    id: data.id,
    codigo: data.codigo,
    descricao: data.descricao,
    tipo: data.tipo as 'FIXO' | 'PERCENTUAL' | 'TABELA',
    valor: data.valor || undefined,
    percentual: data.percentual || undefined,
    tabelaProgressiva: data.tabela_progressiva || undefined,
    ativo: data.ativo,
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
};

export const useDescontosPadrao = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: descontos = [], isLoading: loading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const data = await descontoPadraoService.fetchDescontos();
      return data.map(transformSupabaseToDescontoPadrao);
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const saveDesconto = async (desconto: DescontoPadrao): Promise<boolean> => {
    try {
      if (desconto.id) {
        await descontoPadraoService.updateDesconto(desconto.id, desconto);
      } else {
        await descontoPadraoService.createDesconto(desconto);
      }
      await invalidate();
      return true;
    } catch (error) {
      console.error('[DescontosPadrao] Erro ao salvar desconto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o desconto padrão.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteDesconto = async (id: string): Promise<void> => {
    try {
      await descontoPadraoService.deleteDesconto(id);
      await invalidate();
      toast({
        title: "Sucesso",
        description: "Desconto padrão excluído com sucesso!",
      });
    } catch (error) {
      console.error('[DescontosPadrao] Erro ao excluir desconto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o desconto padrão.",
        variant: "destructive",
      });
    }
  };

  return {
    descontos,
    loading,
    saveDesconto,
    deleteDesconto,
    refetch: invalidate
  };
};
