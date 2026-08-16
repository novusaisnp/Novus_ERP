import { useState } from 'react';
import { FluxoCaixaFiltros } from '@/types/fluxoCaixa';
import { useFluxoCaixa } from '@/hooks/useFluxoCaixa';
import { FluxoCaixaResumo } from '@/components/financeiro/fluxo-caixa/FluxoCaixaResumo';
import { FluxoCaixaTabela } from '@/components/financeiro/fluxo-caixa/FluxoCaixaTabela';
import { FluxoCaixaGrafico } from '@/components/financeiro/fluxo-caixa/FluxoCaixaGrafico';
import { FluxoCaixaFiltros as FiltrosComponent } from '@/components/financeiro/fluxo-caixa/FluxoCaixaFiltros';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

export const FluxoCaixaPage = () => {

  // Estado dos filtros
  const [filtros, setFiltros] = useState<FluxoCaixaFiltros>({
    data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    data_fim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    tipo_movimento: 'TODOS',
    status: 'TODOS',
    tipo_fluxo: 'TODOS'
  });

  // Hook do fluxo de caixa
  const {
    movimentacoes,
    resumo,
    projecao,
    estatisticas,
    dadosGrafico,
    periodoAgrupamento,
    isLoading,
    error,
    invalidateCache
  } = useFluxoCaixa(filtros);

  // Handlers
  const handleFiltrosChange = (novosFiltros: FluxoCaixaFiltros) => {
    setFiltros(novosFiltros);
  };

  const handleRefresh = () => {
    invalidateCache();
  };

  // Render de erro
  if (error) {
    console.error('[FluxoCaixa] Erro na página:', error);
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar fluxo de caixa: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fluxo de Caixa</h1>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <FiltrosComponent
            filtros={filtros}
            onFiltrosChange={handleFiltrosChange}
            onRefresh={handleRefresh}
            movimentacoes={movimentacoes}
            resumo={resumo}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Resumo */}
      <FluxoCaixaResumo 
        resumo={resumo}
        isLoading={isLoading}
      />

      {/* Gráfico */}
      <FluxoCaixaGrafico
        dados={dadosGrafico}
        projecao={projecao}
        isLoading={isLoading}
        periodoAgrupamento={periodoAgrupamento}
      />

      {/* Tabela */}
      <FluxoCaixaTabela 
        movimentacoes={movimentacoes}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Estatísticas (para mobile, colapsado) */}
      {estatisticas && (
        <Card className="md:hidden">
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total de movimentações:</span>
                <span>{estatisticas.total_movimentacoes}</span>
              </div>
              <div className="flex justify-between">
                <span>Média diária entradas:</span>
                <span>R$ {estatisticas.media_diaria_entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Média diária saídas:</span>
                <span>R$ {estatisticas.media_diaria_saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Tendência:</span>
                <span className={
                  estatisticas.tendencia_saldo === 'CRESCENTE' ? 'text-status-delivered' :
                  estatisticas.tendencia_saldo === 'DECRESCENTE' ? 'text-status-cancelled' :
                  'text-status-production'
                }>
                  {estatisticas.tendencia_saldo}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FluxoCaixaPage;