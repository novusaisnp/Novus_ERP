import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const startTime = Date.now();
    const checks = [];

    // Verificação 1: Conectividade com banco de dados
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('count')
        .limit(1);
      
      checks.push({
        name: 'database_connectivity',
        status: error ? 'error' : 'healthy',
        message: error ? error.message : 'Conexão com banco funcionando',
        response_time_ms: Date.now() - startTime
      });
    } catch (error) {
      checks.push({
        name: 'database_connectivity',
        status: 'error',
        message: `Erro na conexão: ${error.message}`,
        response_time_ms: Date.now() - startTime
      });
    }

    // Verificação 2: Estatísticas de sincronização (últimas 24h)
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: syncStats, error } = await supabase
        .from('sync_logs')
        .select('status')
        .gte('created_at', last24h);

      if (error) throw error;

      const stats = (syncStats || []).reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1;
        acc.total++;
        return acc;
      }, { total: 0, success: 0, error: 0, pending: 0 });

      const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 100;

      checks.push({
        name: 'sync_statistics',
        status: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'warning' : 'error',
        message: `Taxa de sucesso: ${successRate}% (${stats.success}/${stats.total})`,
        details: stats,
        response_time_ms: Date.now() - startTime
      });
    } catch (error) {
      checks.push({
        name: 'sync_statistics',
        status: 'error',
        message: `Erro ao obter estatísticas: ${error.message}`,
        response_time_ms: Date.now() - startTime
      });
    }

    // Verificação 3: Webhook configurations ativas
    try {
      const { data: webhookConfigs, error } = await supabase
        .from('webhook_configs')
        .select('target_system, active')
        .eq('active', true);

      if (error) throw error;

      checks.push({
        name: 'webhook_configurations',
        status: 'healthy',
        message: `${webhookConfigs?.length || 0} webhooks ativos`,
        details: webhookConfigs?.map(w => w.target_system) || [],
        response_time_ms: Date.now() - startTime
      });
    } catch (error) {
      checks.push({
        name: 'webhook_configurations',
        status: 'error',
        message: `Erro ao verificar webhooks: ${error.message}`,
        response_time_ms: Date.now() - startTime
      });
    }

    // Verificação 4: Fila de processamento
    try {
      const { data: queueStats, error } = await supabase
        .from('sync_queue')
        .select('status')
        .in('status', ['pending', 'processing']);

      if (error) throw error;

      const pendingItems = queueStats?.length || 0;

      checks.push({
        name: 'processing_queue',
        status: pendingItems < 100 ? 'healthy' : pendingItems < 500 ? 'warning' : 'error',
        message: `${pendingItems} itens na fila`,
        details: { pending_items: pendingItems },
        response_time_ms: Date.now() - startTime
      });
    } catch (error) {
      checks.push({
        name: 'processing_queue',
        status: 'error',
        message: `Erro ao verificar fila: ${error.message}`,
        response_time_ms: Date.now() - startTime
      });
    }

    // Verificação 5: Performance das edge functions
    const functionChecks = await Promise.allSettled([
      checkFunctionHealth('sync-webhook'),
      checkFunctionHealth('retry-failed-syncs')
    ]);

    functionChecks.forEach((result, index) => {
      const functionNames = ['sync-webhook', 'retry-failed-syncs'];
      const functionName = functionNames[index];
      
      if (result.status === 'fulfilled') {
        checks.push({
          name: `function_${functionName.replace('-', '_')}`,
          status: result.value.status,
          message: result.value.message,
          response_time_ms: result.value.response_time_ms
        });
      } else {
        checks.push({
          name: `function_${functionName.replace('-', '_')}`,
          status: 'error',
          message: `Erro ao verificar função: ${result.reason}`,
          response_time_ms: Date.now() - startTime
        });
      }
    });

    // Determinar status geral
    const hasErrors = checks.some(check => check.status === 'error');
    const hasWarnings = checks.some(check => check.status === 'warning');
    
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy';
    
    const totalResponseTime = Date.now() - startTime;

    const healthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      response_time_ms: totalResponseTime,
      checks: checks,
      summary: {
        total_checks: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        warnings: checks.filter(c => c.status === 'warning').length,
        errors: checks.filter(c => c.status === 'error').length
      }
    };

    console.log('Health check concluído:', {
      status: overallStatus,
      checks: checks.length,
      responseTime: `${totalResponseTime}ms`
    });

    return new Response(JSON.stringify(healthReport), {
      status: hasErrors ? 503 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no health check:', error);
    
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkFunctionHealth(functionName: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Para health check, apenas verificamos se a função está respondendo
    // Não fazemos chamadas que executem lógica de negócio
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`, {
      method: 'OPTIONS', // OPTIONS request para verificar CORS
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        'Content-Type': 'application/json'
      }
    });

    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 200) {
      return {
        status: 'healthy',
        message: `Função ${functionName} respondendo`,
        response_time_ms: responseTime
      };
    } else {
      return {
        status: 'warning',
        message: `Função ${functionName} retornou status ${response.status}`,
        response_time_ms: responseTime
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: `Função ${functionName} não acessível: ${error.message}`,
      response_time_ms: Date.now() - startTime
    };
  }
}