
import { useState, useEffect } from 'react';
import { Colaborador } from '@/types/rh';
import { colaboradorService } from '@/services/colaboradorService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

export const useColaboradores = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadColaboradores = async () => {
    setLoading(true);
    try {
      const data = await colaboradorService.fetchColaboradores();
      const colaboradoresFormatados = data.map(rhUtils.transformSupabaseToColaborador);
      setColaboradores(colaboradoresFormatados);
    } catch (error) {
      console.error('[RH] Erro ao carregar colaboradores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveColaborador = async (colaboradorData: Colaborador) => {
    setLoading(true);
    try {
      // Validar dados antes de salvar
      const validation = rhUtils.validateColaboradorData(colaboradorData);
      if (!validation.isValid) {
        toast({
          title: "Erro de Validação",
          description: validation.error,
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      if (colaboradorData.id) {
        // Atualizar colaborador existente
        await colaboradorService.updateColaborador(colaboradorData.id, colaboradorData);
        toast({
          title: "Sucesso",
          description: "Colaborador atualizado com sucesso!",
        });
      } else {
        // Criar novo colaborador
        await colaboradorService.createColaborador(colaboradorData);
        toast({
          title: "Sucesso",
          description: "Colaborador criado com sucesso!",
        });
      }

      // Recarregar lista
      await loadColaboradores();
      return true;
    } catch (error) {
      console.error('[RH] Erro ao salvar colaborador:', error);
      toast({
        title: "Erro",
        description: rhUtils.getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      await colaboradorService.deleteColaborador(id);
      await loadColaboradores();
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColaboradores();
  }, []);

  return {
    colaboradores,
    loading,
    saveColaborador,
    deleteColaborador,
    refetch: loadColaboradores
  };
};
