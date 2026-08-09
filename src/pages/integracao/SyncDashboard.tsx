
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  AlertTriangle,
  Database
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useSyncLogs } from '@/hooks/useSyncLogs';
import { useSyncHealth } from '@/hooks/useSyncHealth';

const SyncDashboard: React.FC = () => {
  const { syncStatus, loading: statsLoading, fetchSyncStatus, retryFailedSyncs } = useSyncStatus();
  const { logs, loading: logsLoading, fetchLogs } = useSyncLogs(20);
  const { health, loading: healthLoading, fetchHealth } = useSyncHealth();

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchSyncStatus(),
      fetchLogs(),
      fetchHealth()
    ]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-status-delivered/10 text-status-delivered">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-status-delivered';
      case 'warning':
        return 'text-status-production';
      case 'error':
        return 'text-status-cancelled';
      default:
        return 'text-status-draft';
    }
  };

  const successRate24h = syncStatus.last24h.total > 0 
    ? Math.round((syncStatus.last24h.success / syncStatus.last24h.total) * 100) 
    : 0;

  const successRate7d = syncStatus.last7d.total > 0 
    ? Math.round((syncStatus.last7d.success / syncStatus.last7d.total) * 100) 
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Sincronização</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da integração entre sistemas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshAll}
            disabled={statsLoading || logsLoading || healthLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${(statsLoading || logsLoading || healthLoading) ? 'animate-spin' : ''}`} />
            Atualizar Tudo
          </Button>
          {syncStatus.last24h.error > 0 && (
            <Button 
              variant="destructive" 
              onClick={retryFailedSyncs}
              disabled={statsLoading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reprocessar Falhas
            </Button>
          )}
        </div>
      </div>

      {/* Status Geral do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status Geral do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                health?.status === 'healthy' ? 'bg-status-delivered' :
                health?.status === 'warning' ? 'bg-status-production' : 'bg-status-cancelled'
              }`} />
              <span className={`font-medium ${getHealthStatusColor(health?.status || 'unknown')}`}>
                {health?.status === 'healthy' ? 'Sistema Saudável' :
                 health?.status === 'warning' ? 'Atenção Necessária' : 'Sistema com Problemas'}
              </span>
            </div>
            {health && (
              <>
                <span className="text-sm text-muted-foreground">
                  Tempo de resposta: {health.response_time_ms}ms
                </span>
                <span className="text-sm text-muted-foreground">
                  Verificações: {health.summary.healthy}/{health.summary.total_checks}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="24h" className="space-y-4">
        <TabsList>
          <TabsTrigger value="24h">Últimas 24 Horas</TabsTrigger>
          <TabsTrigger value="7d">Últimos 7 Dias</TabsTrigger>
        </TabsList>

        <TabsContent value="24h" className="space-y-4">
          {/* Métricas das Últimas 24h */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{syncStatus.last24h.total}</div>
                <p className="text-xs text-muted-foreground">Últimas 24h</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sucesso</CardTitle>
                <CheckCircle className="h-4 w-4 text-status-delivered" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-status-delivered">
                  {syncStatus.last24h.success}
                </div>
                <p className="text-xs text-muted-foreground">
                  Taxa: {successRate24h}%
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
                  {syncStatus.last24h.error}
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
                  {syncStatus.last24h.pending}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em processamento
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Barras - 24h */}
          <Card>
            <CardHeader>
              <CardTitle>Sincronizações por Hora (Últimas 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={syncStatus.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="#22c55e" name="Sucesso" />
                  <Bar dataKey="error" fill="#ef4444" name="Erro" />
                  <Bar dataKey="pending" fill="#f59e0b" name="Pendente" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="7d" className="space-y-4">
          {/* Métricas dos Últimos 7 Dias */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{syncStatus.last7d.total}</div>
                <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
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
                  Taxa: {successRate7d}%
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
                  Total do período
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

          {/* Taxa de Sucesso */}
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Sucesso (7 dias)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sincronizações Bem-sucedidas</span>
                <span className="text-sm text-muted-foreground">{successRate7d}%</span>
              </div>
              <Progress value={successRate7d} className="h-2" />
              
              {syncStatus.last7d.lastSync && (
                <p className="text-sm text-muted-foreground">
                  Última sincronização: {new Date(syncStatus.last7d.lastSync).toLocaleString('pt-BR')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Tabela de Logs Detalhados */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Sincronizações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tempo (ms)</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.operation_type}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.table_name}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(log.status)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.execution_time_ms || '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.source_system || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-status-cancelled max-w-xs truncate">
                    {log.error_message || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SyncDashboard;
