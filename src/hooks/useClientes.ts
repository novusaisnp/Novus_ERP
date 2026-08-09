import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clienteService } from '@/services/clienteService';
import { Cliente } from '@/types/cliente';
import { useToast } from '@/components/ui/use-toast';
import { clienteUtils } from '@/utils/clienteUtils';

export const useClientes = (empresaRepresentadaId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: clientes = [], isLoading: loading } = useQuery({
    queryKey: ['clientes', empresaRepresentadaId],
    queryFn: async () => {
      if (!empresaRepresentadaId) return [];
      try {
        const data = await clienteService.fetchClientes(empresaRepresentadaId);
        return (data as any[]).map(clienteUtils.transformSupabaseToCliente);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        const errorMessage = clienteUtils.getErrorMessage(error as { code?: string; message?: string });
        toast({
          title: "Erro",
          description: errorMessage || "Erro inesperado ao carregar os clientes.",
          variant: "destructive"
        });
        throw error;
      }
    },
    enabled: !!empresaRepresentadaId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clientes', empresaRepresentadaId] });

  const handleError = (error: unknown, defaultMessage: string) => {
    console.error('Erro:', error);
    const errorMessage = clienteUtils.getErrorMessage(error as { code?: string; message?: string });
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

  const saveCliente = async (clienteData: Cliente) => {
    if (!empresaRepresentadaId) {
      toast({
        title: "Erro",
        description: "ID da empresa não disponível. Não foi possível salvar o cliente.",
        variant: "destructive"
      });
      return false;
    }

    const validation = clienteUtils.validateCliente(clienteData);
    if (!validation.isValid) {
      toast({
        title: "Erro de validação",
        description: validation.error!,
        variant: "destructive"
      });
      return false;
    }

    try {
      if (clienteData.id) {
        await clienteService.updateCliente(clienteData.id, clienteData, empresaRepresentadaId);
        handleSuccess("Cliente atualizado com sucesso!");
      } else {
        await clienteService.createCliente(clienteData, empresaRepresentadaId);
        handleSuccess("Cliente criado com sucesso!");
      }
      await invalidate();
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao salvar os dados.");
      return false;
    }
  };

  const deleteCliente = async (id: string) => {
    if (!id) {
      toast({
        title: "Erro de validação",
        description: "ID do cliente é obrigatório para exclusão.",
        variant: "destructive"
      });
      return false;
    }
    if (!empresaRepresentadaId) {
      toast({
        title: "Erro",
        description: "ID da empresa não disponível. Não foi possível excluir o cliente.",
        variant: "destructive"
      });
      return false;
    }

    try {
      await clienteService.deleteCliente(id, empresaRepresentadaId);
      await invalidate();
      handleSuccess("Cliente excluído com sucesso!");
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao excluir os dados.");
      return false;
    }
  };

  return {
    clientes,
    loading,
    saveCliente,
    deleteCliente,
    refetch: invalidate
  };
};