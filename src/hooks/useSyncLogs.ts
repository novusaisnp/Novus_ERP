
import { useState, useEffect } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase: any = _supabase;
import { useToast } from '@/hooks/use-toast';

interface SyncLog {
  id: string;
  operation_type: string;
  table_name: string;
  record_id: string;
  status: string;
  source_system: string;
  created_at: string;
  processed_at?: string;
  execution_time_ms?: number;
  error_message?: string;
  data_payload?: any;
}

export const useSyncLogs = (limit: number = 20) => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      setLogs((data as any as SyncLog[]) || []);
      
    } catch (error: any) {
      console.error('Erro ao buscar logs de sincronização:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs de sincronização",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [limit]);

  return {
    logs,
    loading,
    fetchLogs,
    refetch: fetchLogs
  };
};
