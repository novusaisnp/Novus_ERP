
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getEmpresaAtivaIdOuFalha } from '@/lib/empresaAtiva';

interface HealthCheck {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  response_time_ms: number;
  checks: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'error';
    message: string;
    response_time_ms: number;
  }>;
  summary: {
    total_checks: number;
    healthy: number;
    warnings: number;
    errors: number;
  };
}

export const useSyncHealth = () => {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHealth = async () => {
    try {
      setLoading(true);

      const empresaId = await getEmpresaAtivaIdOuFalha();
      const { data, error } = await supabase.functions.invoke('health-check', {
        body: { empresaId },
      });
      
      if (error) throw error;
      
      setHealth(data);
      
    } catch (error: unknown) {
      console.error('Erro ao buscar health check:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status do sistema",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Verificar health a cada 5 minutos
    const interval = setInterval(fetchHealth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    health,
    loading,
    fetchHealth,
    refetch: fetchHealth
  };
};
