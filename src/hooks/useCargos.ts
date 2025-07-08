
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
    console.log('[Cargos] Iniciando carregamento de cargos');
    setLoading(true);
    try {
      const data = await cargoService.fetchCargos();
      console.log('[Cargos] Dados brutos do Supabase:', data);
      
      const cargosFormatados = data.map(rhUtils.transformSupabaseToCargo);
      console.log('[Cargos] Cargos formatados:', cargosFormatados);
      
      setCargos(cargosFormatados);
      console.log('[Cargos] Estado atualizado com', cargosFormatados.length, 'cargos');
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
    console.log('[Cargos] Iniciando salvamento de cargo:', cargoData.nome);
    setLoading(true);
    
    try {
      // Validação obrigatória
      if (!cargoData.nome?.trim()) {
        console.log('[Cargos] Validação falhou: nome obrigatório');
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
        console.log('[Cargos] Atualizando cargo existente:', cargoData.id);
        resultado = await cargoService.updateCargo(cargoData.id, cargoData);
      } else {
        console.log('[Cargos] Criando novo cargo');
        resultado = await cargoService.createCargo(cargoData);
      }

      console.log('[Cargos] Cargo salvo com sucesso:', resultado);
      
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
    console.log('[Cargos] Iniciando exclusão de cargo:', id);
    setLoading(true);
    try {
      await cargoService.deleteCargo(id);
      console.log('[Cargos] Cargo excluído com sucesso');
      
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
    console.log('[Cargos] Hook inicializado, carregando cargos');
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
