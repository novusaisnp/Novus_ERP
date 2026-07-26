// FILE NAME: useClientes.ts
// FILE CONTENT: 
import { useState, useEffect } from 'react';
import { clienteService } from '@/services/clienteService';
import { Cliente } from '@/types/cliente';
import { useToast } from '@/components/ui/use-toast';
import { clienteUtils } from '@/utils/clienteUtils';

// Recebe o ID da empresa como parâmetro
export const useClientes = (empresaRepresentadaId: string | null) => { // <--- PARÂMETRO ADICIONADO
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Usar o empresaRepresentadaId passado como parâmetro
  const currentEmpresaId = empresaRepresentadaId;

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

  const loadClientes = async () => {
    if (!currentEmpresaId) { // <--- VERIFICA SE O ID DA EMPRESA EXISTE
      console.warn('empresaRepresentadaId não disponível. Não foi possível carregar clientes.');
      setClientes([]);
      return;
    }
    setLoading(true);
    try {
      const data = await clienteService.fetchClientes(currentEmpresaId); // <--- PASSA O ID DA EMPRESA
      const clientesFormatados = (data as any[]).map(clienteUtils.transformSupabaseToCliente);
      setClientes(clientesFormatados);
    } catch (error) {
      handleError(error, "Erro inesperado ao carregar os clientes.");
    } finally {
      setLoading(false);
    }
  };

  const saveCliente = async (clienteData: Cliente) => {
    if (!currentEmpresaId) { // <--- VERIFICA SE O ID DA EMPRESA EXISTE
      toast({
        title: "Erro",
        description: "ID da empresa não disponível. Não foi possível salvar o cliente.",
        variant: "destructive"
      });
      return false;
    }

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
        await clienteService.updateCliente(clienteData.id, clienteData, currentEmpresaId); // <--- PASSA O ID DA EMPRESA
        handleSuccess("Cliente atualizado com sucesso!");
      } else {
        await clienteService.createCliente(clienteData, currentEmpresaId); // <--- PASSA O ID DA EMPRESA
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
    if (!currentEmpresaId) { // <--- VERIFICA SE O ID DA EMPRESA EXISTE
      toast({
        title: "Erro",
        description: "ID da empresa não disponível. Não foi possível excluir o cliente.",
        variant: "destructive"
      });
      return false;
    }

    setLoading(true);
    try {
      await clienteService.deleteCliente(id, currentEmpresaId); // <--- PASSA O ID DA EMPRESA
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
    if (currentEmpresaId) { // <--- CARREGA CLIENTES APENAS SE O ID DA EMPRESA FOR VÁLIDO
      loadClientes();
    }
  }, [currentEmpresaId]); // <--- RECARREGA QUANDO O ID DA EMPRESA MUDA

  return {
    clientes,
    loading,
    saveCliente,
    deleteCliente,
    refetch: loadClientes
  };
};