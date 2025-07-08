import { useState, useEffect } from 'react';
import { Setor } from '@/types/setor';
import { setorService } from '@/services/setorService';
import { useToast } from '@/hooks/use-toast';

export const useSetores = () => {
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadSetores = async () => {
    setLoading(true);
    try {
      const data = await setorService.fetchSetores();
      setSetores(data);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os setores.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetores();
  }, []);

  return {
    setores,
    loading,
    refetch: loadSetores
  };
};