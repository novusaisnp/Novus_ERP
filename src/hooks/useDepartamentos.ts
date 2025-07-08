
import { useState, useEffect } from 'react';
import { Departamento } from '@/types/rh';
import { departamentoService } from '@/services/departamentoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

export const useDepartamentos = () => {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadDepartamentos = async () => {
    setLoading(true);
    try {
      console.log('[RH] Iniciando carregamento de departamentos...');
      const data = await departamentoService.fetchDepartamentos();
      const departamentosFormatados = data.map(rhUtils.transformSupabaseToDepartamento);
      console.log('[RH] Departamentos formatados:', departamentosFormatados);
      setDepartamentos(departamentosFormatados);
    } catch (error) {
      console.error('[RH] Erro ao carregar departamentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os departamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDepartamento = async (departamentoData: Departamento) => {
    console.log('[RH] Iniciando salvamento de departamento:', departamentoData);
    setLoading(true);
    
    try {
      // Validação básica
      if (!departamentoData.nome?.trim()) {
        console.error('[RH] Validação falhou: Nome é obrigatório');
        toast({
          title: "Erro de Validação",
          description: "Nome do departamento é obrigatório.",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      let result;
      if (departamentoData.id) {
        console.log('[RH] Atualizando departamento existente:', departamentoData.id);
        result = await departamentoService.updateDepartamento(departamentoData.id, departamentoData);
      } else {
        console.log('[RH] Criando novo departamento');
        result = await departamentoService.createDepartamento(departamentoData);
      }

      console.log('[RH] Resultado da operação:', result);

      // Recarregar lista de departamentos
      await loadDepartamentos();

      // Toast de sucesso
      toast({
        title: "Sucesso!",
        description: departamentoData.id 
          ? "Departamento atualizado com sucesso!" 
          : "Departamento criado com sucesso!",
      });

      console.log('[RH] Departamento salvo com sucesso');
      return true;

    } catch (error) {
      console.error('[RH] Erro ao salvar departamento:', error);
      
      // Melhor tratamento de erro
      let errorMessage = "Erro desconhecido ao salvar departamento.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.details) {
          errorMessage = errorObj.details;
        }
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartamento = async (id: string) => {
    console.log('[RH] Iniciando exclusão de departamento:', id);
    setLoading(true);
    
    try {
      await departamentoService.deleteDepartamento(id);
      await loadDepartamentos();
      
      toast({
        title: "Sucesso",
        description: "Departamento excluído com sucesso!",
      });
      
      console.log('[RH] Departamento excluído com sucesso');
      return true;
      
    } catch (error) {
      console.error('[RH] Erro ao excluir departamento:', error);
      
      let errorMessage = "Erro desconhecido ao excluir departamento.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        }
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartamentos();
  }, []);

  return {
    departamentos,
    loading,
    saveDepartamento,
    deleteDepartamento,
    refetch: loadDepartamentos
  };
};
