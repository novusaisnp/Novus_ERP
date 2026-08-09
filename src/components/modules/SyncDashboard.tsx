
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  AlertTriangle 
} from 'lucide-react';
import { useSyncStatus } from '@/hooks/useSyncStatus';

export const SyncDashboard: React.FC = () => {
  const { syncStatus, loading, fetchSyncStatus, retryFailedSyncs } = useSyncStatus();

  const successRate = syncStatus.last7d.total > 0 ? 
    Math.round((syncStatus.last7d.success / syncStatus.last7d.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Status de Sincronização</h2>
          <p className="text-muted-foreground">
            Monitoramento da integração com sistemas externos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchSyncStatus}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {syncStatus.last7d.error > 0 && (
            <Button 
              variant="destructive" 
              onClick={retryFailedSyncs}
              disabled={loading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reprocessar Falhas
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStatus.last7d.total}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 7 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-delivered" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-delivered">
              {syncStatus.last7d.success}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa: {successRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <XCircle className="h-4 w-4 text-status-cancelled" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-cancelled">
              {syncStatus.last7d.error}
            </div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-status-production" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-production">
              {syncStatus.last7d.pending}
            </div>
            <p className="text-xs text-muted-foreground">
              Em processamento
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Taxa de Sucesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sincronizações Bem-sucedidas</span>
            <span className="text-sm text-muted-foreground">{successRate}%</span>
          </div>
          <Progress value={successRate} className="h-2" />
          
          {syncStatus.last7d.lastSync && (
            <p className="text-sm text-muted-foreground">
              Última sincronização: {new Date(syncStatus.last7d.lastSync).toLocaleString('pt-BR')}
            </p>
          )}
          
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-status-delivered">
              {syncStatus.last7d.success} Sucesso
            </Badge>
            {syncStatus.last7d.error > 0 && (
              <Badge variant="destructive">
                {syncStatus.last7d.error} Erro
              </Badge>
            )}
            {syncStatus.last7d.pending > 0 && (
              <Badge variant="secondary">
                {syncStatus.last7d.pending} Pendente
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
