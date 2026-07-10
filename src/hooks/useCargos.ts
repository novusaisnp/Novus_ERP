
import { useState, useEffect } from 'react';
import { Cargo } from '@/types/rh';
import { cargoService } from '@/services/cargoService';
import { rhUtils } from '@/utils/rhUtils';
import { useToast } from '@/hooks/use-toast';

export const useCargos = () => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadCargos = async () => {
    setLoading(true);
    try {
      const data = await cargoService.fetchCargos();
      
      const cargosFormatados = data.map(rhUtils.transformSupabaseToCargo);
      
      setCargos(cargosFormatados);
    } catch (error) {
      console.error('[Cargos] Erro ao carregar cargos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cargos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCargo = async (cargoData: Cargo) => {
    setLoading(true);
    
    try {
      // Validação obrigatória
      if (!cargoData.nome?.trim()) {
        toast({
          title: "Erro de Validação",
          description: "Nome do cargo é obrigatório.",
          variant: "destructive",
        });
        setLoading(false);
        return false;
      }

      let resultado;
      if (cargoData.id) {
        resultado = await cargoService.updateCargo(cargoData.id, cargoData);
      } else {
        resultado = await cargoService.createCargo(cargoData);
      }

      
      // Recarrega a lista para garantir dados atualizados
      await loadCargos();
      
      return true;
    } catch (error) {
      console.error('[Cargos] Erro ao salvar cargo:', error);
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

  const deleteCargo = async (id: string) => {
    setLoading(true);
    try {
      await cargoService.deleteCargo(id);
      
      // Recarrega a lista
      await loadCargos();
      
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCargos();
  }, []);

  return {
    cargos,
    loading,
    saveCargo,
    deleteCargo,
    refetch: loadCargos
  };
};
