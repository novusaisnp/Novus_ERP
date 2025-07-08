
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: any;
}

export const SupabaseConnectionTest: React.FC = () => {
  const { user, session } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest = { name, status, message, details };
      
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runConnectionTests = async () => {
    console.log('[SupabaseTest] Iniciando testes de conexão');
    setIsRunning(true);
    setTests([]);

    try {
      // Teste 1: Verificar conexão básica
      updateTest('connection', 'loading', 'Testando conexão básica...');
      
      const { data: healthCheck, error: healthError } = await supabase.from('bancos').select('count').limit(1);
      
      if (healthError) {
        updateTest('connection', 'error', `Erro de conexão: ${healthError.message}`, healthError);
      } else {
        updateTest('connection', 'success', 'Conexão estabelecida com sucesso');
      }

      // Teste 2: Verificar autenticação
      updateTest('auth', 'loading', 'Verificando autenticação...');
      
      if (!user || !session) {
        updateTest('auth', 'warning', 'Usuário não autenticado - algumas funcionalidades podem não funcionar');
      } else {
        updateTest('auth', 'success', `Usuário autenticado: ${user.email}`, {
          userId: user.id,
          sessionExpires: session.expires_at
        });
      }

      // Teste 3: Verificar acesso às tabelas principais
      const testTableAccess = async (tableName: string) => {
        updateTest(`table_${tableName}`, 'loading', `Testando acesso à tabela ${tableName}...`);
        
        try {
          let query;
          switch (tableName) {
            case 'bancos':
              query = supabase.from('bancos').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'agencias_bancarias':
              query = supabase.from('agencias_bancarias').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'contas_bancarias':
              query = supabase.from('contas_bancarias').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'plano_contas':
              query = supabase.from('plano_contas').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'centros_custo':
              query = supabase.from('centros_custo').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'fornecedores':
              query = supabase.from('fornecedores').select('*', { count: 'exact', head: true }).limit(1);
              break;
            case 'clientes':
              query = supabase.from('clientes').select('*', { count: 'exact', head: true }).limit(1);
              break;
            default:
              throw new Error(`Tabela ${tableName} não suportada`);
          }

          const { data, error, count } = await query;

          if (error) {
            updateTest(`table_${tableName}`, 'error', `Erro ao acessar ${tableName}: ${error.message}`, error);
          } else {
            updateTest(`table_${tableName}`, 'success', `Tabela ${tableName} acessível (${count || 0} registros)`);
          }
        } catch (err) {
          updateTest(`table_${tableName}`, 'error', `Erro inesperado ao acessar ${tableName}`, err);
        }
      };

      // Testar tabelas principais
      const tablesToTest = [
        'bancos',
        'agencias_bancarias', 
        'contas_bancarias',
        'plano_contas',
        'centros_custo',
        'fornecedores',
        'clientes'
      ];

      for (const table of tablesToTest) {
        await testTableAccess(table);
      }

      // Teste 4: Verificar RLS
      updateTest('rls', 'loading', 'Verificando políticas RLS...');
      
      try {
        // Tentar inserir um registro de teste (deve ser permitido se RLS estiver funcionando)
        const testData = {
          nome: 'TESTE_CONEXAO',
          codigo: 'TEST',
          pais: 'Brasil'
        };

        const { data: insertData, error: insertError } = await supabase
          .from('bancos')
          .insert(testData)
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '42501') {
            updateTest('rls', 'error', 'RLS está bloqueando operações - verifique políticas de acesso');
          } else {
            updateTest('rls', 'warning', `RLS funcionando, mas erro: ${insertError.message}`);
          }
        } else {
          // Limpar o registro de teste
          await supabase.from('bancos').delete().eq('id', insertData.id);
          updateTest('rls', 'success', 'RLS está funcionando corretamente');
        }
      } catch (err) {
        updateTest('rls', 'error', 'Erro ao testar RLS', err);
      }

      // Teste 5: Verificar real-time (se habilitado)
      updateTest('realtime', 'loading', 'Testando funcionalidade real-time...');
      
      try {
        const channel = supabase.channel('test-channel');
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            updateTest('realtime', 'success', 'Real-time funcionando');
            supabase.removeChannel(channel);
          } else if (status === 'CHANNEL_ERROR') {
            updateTest('realtime', 'error', 'Erro no canal real-time');
          }
        });

        // Timeout para o teste de real-time
        setTimeout(() => {
          const realtimeTest = tests.find(t => t.name === 'realtime');
          if (realtimeTest?.status === 'loading') {
            updateTest('realtime', 'warning', 'Real-time não respondeu (pode estar desabilitado)');
          }
        }, 5000);

      } catch (err) {
        updateTest('realtime', 'error', 'Erro ao testar real-time', err);
      }

    } catch (error) {
      console.error('[SupabaseTest] Erro geral nos testes:', error);
      updateTest('general', 'error', 'Erro geral nos testes', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      success: 'default' as const,
      error: 'destructive' as const,
      warning: 'secondary' as const,
      loading: 'outline' as const
    };

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  useEffect(() => {
    // Executar testes automaticamente ao carregar
    runConnectionTests();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Teste de Conexão Supabase - ERP NOVUS
            {isRunning && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            Verificando conectividade, autenticação e acesso às tabelas do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={runConnectionTests} 
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  'Executar Testes'
                )}
              </Button>
            </div>

            {tests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Resultados dos Testes:</h3>
                
                {tests.map((test) => (
                  <div 
                    key={test.name} 
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{test.name}</span>
                        {getStatusBadge(test.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {test.message}
                      </p>
                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Ver detalhes
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Informações do Sistema:</h4>
              <div className="text-sm space-y-1">
                <p><strong>Projeto:</strong> NOVUS - ERP - MODULAR</p>
                <p><strong>URL Supabase:</strong> https://knpffzqhqrzdcutqeicp.supabase.co</p>
                <p><strong>Usuário:</strong> {user?.email || 'Não autenticado'}</p>
                <p><strong>Status da Sessão:</strong> {session ? 'Ativa' : 'Inativa'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupabaseConnectionTest;
