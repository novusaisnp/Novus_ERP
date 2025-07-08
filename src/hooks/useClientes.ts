
import { useState, useEffect } from 'react';
import { Cliente } from '@/types/cliente';
import { clienteService } from '@/services/clienteService';
import { clienteUtils } from '@/utils/clienteUtils';
import { useToast } from '@/hooks/use-toast';

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleError = (error: any, defaultMessage: string) => {
    console.error('Erro:', error);
    const errorMessage = clienteUtils.getErrorMessage(error);
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

  const loadClientes = async () => {
    setLoading(true);
    try {
      const data = await clienteService.fetchClientes();
      const clientesFormatados = data.map(clienteUtils.transformSupabaseToCliente);
      setClientes(clientesFormatados);
    } catch (error) {
      handleError(error, "Erro inesperado ao carregar os clientes.");
    } finally {
      setLoading(false);
    }
  };

  const saveCliente = async (clienteData: Cliente) => {
    setLoading(true);
    try {
      const validation = clienteUtils.validateCliente(clienteData);
      if (!validation.isValid) {
        toast({
          title: "Erro de validação",
          description: validation.error!,
          variant: "destructive"
        });
        setLoading(false);
        return false;
      }

      if (clienteData.id) {
        await clienteService.updateCliente(clienteData.id, clienteData);
        handleSuccess("Cliente atualizado com sucesso!");
      } else {
        await clienteService.createCliente(clienteData);
        handleSuccess("Cliente criado com sucesso!");
      }

      await loadClientes();
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao salvar os dados.");
      return false;
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      await clienteService.deleteCliente(id);
      await loadClientes();
      handleSuccess("Cliente excluído com sucesso!");
      return true;
    } catch (error) {
      handleError(error, "Erro inesperado ao excluir os dados.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

  return {
    clientes,
    loading,
    saveCliente,
    deleteCliente,
    refetch: loadClientes
  };
};
