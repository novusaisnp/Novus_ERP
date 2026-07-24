
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncStatus {
  total: number;
  success: number;
  error: number;
  pending: number;
  lastSync?: string;
}

interface SyncStatusPeriod {
  last24h: SyncStatus;
  last7d: SyncStatus;
  chartData: Array<{
    period: string;
    success: number;
    error: number;
    pending: number;
  }>;
}

type DbSyncLogStatus = 'PENDENTE' | 'PROCESSANDO' | 'SUCESSO' | 'ERRO' | 'IGNORADO';
type SyncLogBucket = 'success' | 'error' | 'pending';

interface SyncLogRow {
  status: DbSyncLogStatus;
  created_at: string;
}

type CountsByStatus = Record<SyncLogBucket, number>;

const emptyCounts = (): CountsByStatus => ({ success: 0, error: 0, pending: 0 });

const toBucket = (status: DbSyncLogStatus): SyncLogBucket => {
  if (status === 'SUCESSO') return 'success';
  if (status === 'ERRO') return 'error';
  return 'pending'; // PENDENTE, PROCESSANDO, IGNORADO
};

export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusPeriod>({
    last24h: { total: 0, success: 0, error: 0, pending: 0 },
    last7d: { total: 0, success: 0, error: 0, pending: 0 },
    chartData: []
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchSyncStatus = async () => {
    try {
      setLoading(true);

      // Buscar dados das últimas 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: last24hData, error: error24h } = await supabase
        .from('sync_logs')
        .select('status, created_at')
        .gte('created_at', twentyFourHoursAgo);

      if (error24h) throw error24h;

      // Buscar dados dos últimos 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: last7dData, error: error7d } = await supabase
        .from('sync_logs')
        .select('status, created_at')
        .gte('created_at', sevenDaysAgo);

      if (error7d) throw error7d;

      const rows24h = (last24hData ?? []) as SyncLogRow[];
      const rows7d = (last7dData ?? []) as SyncLogRow[];

      // Processar dados das últimas 24h
      const stats24h = rows24h.reduce((acc, log) => {
        acc.total++;
        acc[toBucket(log.status)]++;
        return acc;
      }, { total: 0, ...emptyCounts() });

      // Processar dados dos últimos 7 dias
      const stats7d = rows7d.reduce((acc, log) => {
        acc.total++;
        acc[toBucket(log.status)]++;
        return acc;
      }, { total: 0, ...emptyCounts() });

      // Preparar dados para gráfico (últimas 24h por hora)
      const chartData = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(Date.now() - i * 60 * 60 * 1000);
        const hourEnd = new Date(Date.now() - (i - 1) * 60 * 60 * 1000);

        const hourData = rows24h.filter((log) => {
          const logTime = new Date(log.created_at);
          return logTime >= hourStart && logTime < hourEnd;
        });

        const hourStats = hourData.reduce((acc, log) => {
          acc[toBucket(log.status)]++;
          return acc;
        }, emptyCounts());

        chartData.push({
          period: hourStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          ...hourStats
        });
      }

      const lastSync = rows24h[0]?.created_at;

      setSyncStatus({
        last24h: { ...stats24h, lastSync },
        last7d: { ...stats7d, lastSync },
        chartData
      });

    } catch (error) {
      console.error('Erro ao buscar status de sincronização:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o status de sincronização",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const retryFailedSyncs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('retry-failed-syncs');

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${data.processed} sincronizações reprocessadas`,
      });

      // Atualizar status após retry
      await fetchSyncStatus();

    } catch (error) {
      console.error('Erro ao reprocessar sincronizações:', error);
      toast({
        title: "Erro",
        description: "Erro ao reprocessar sincronizações falhadas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();

    // Atualizar status a cada 30 segundos
    const interval = setInterval(fetchSyncStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    syncStatus,
    loading,
    fetchSyncStatus,
    retryFailedSyncs
  };
};
