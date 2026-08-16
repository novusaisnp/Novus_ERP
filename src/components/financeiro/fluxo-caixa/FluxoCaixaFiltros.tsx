import { useState } from 'react';
import { FluxoCaixaFiltros as FluxoCaixaFiltrosType, FluxoCaixaItem, FluxoCaixaResumo } from '@/types/fluxoCaixa';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FluxoCaixaExportButtons } from './FluxoCaixaExportButtons';
import { RefreshCw, Search, Filter } from 'lucide-react';

interface FluxoCaixaFiltrosProps {
  filtros: FluxoCaixaFiltrosType;
  onFiltrosChange: (filtros: FluxoCaixaFiltrosType) => void;
  onRefresh: () => void;
  movimentacoes?: FluxoCaixaItem[];
  resumo?: FluxoCaixaResumo;
  isLoading?: boolean;
}

export const FluxoCaixaFiltros = ({ filtros, onFiltrosChange, onRefresh, movimentacoes = [], resumo, isLoading = false }: FluxoCaixaFiltrosProps) => {
  const [localFiltros, setLocalFiltros] = useState(filtros);

  const handleChange = (key: keyof FluxoCaixaFiltrosType, value: any) => {
    const novosFiltros = { ...localFiltros, [key]: value };
    setLocalFiltros(novosFiltros);
    onFiltrosChange(novosFiltros);
  };

  const handleReset = () => {
    const filtrosLimpos: FluxoCaixaFiltrosType = {
      data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      data_fim: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
      tipo_movimento: 'TODOS',
      status: 'TODOS',
      tipo_fluxo: 'TODOS'
    };
    setLocalFiltros(filtrosLimpos);
    onFiltrosChange(filtrosLimpos);
  };

  return (
    <div className="space-y-4">
      {/* Primeira linha - Datas e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data_inicio">Data Início</Label>
          <Input
            id="data_inicio"
            type="date"
            value={localFiltros.data_inicio || ''}
            onChange={(e) => handleChange('data_inicio', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="data_fim">Data Fim</Label>
          <Input
            id="data_fim"
            type="date"
            value={localFiltros.data_fim || ''}
            onChange={(e) => handleChange('data_fim', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="busca">Busca</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="busca"
              type="text"
              placeholder="Buscar por descrição..."
              value={localFiltros.busca || ''}
              onChange={(e) => handleChange('busca', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Período do gráfico</Label>
          <Select
            value={localFiltros.periodo_agrupamento || 'DIARIO'}
            onValueChange={(value) => handleChange('periodo_agrupamento', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIARIO">Diário</SelectItem>
              <SelectItem value="SEMANAL">Semanal</SelectItem>
              <SelectItem value="MENSAL">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Segunda linha - Filtros de Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Movimento</Label>
          <Select 
            value={localFiltros.tipo_movimento || 'TODOS'} 
            onValueChange={(value) => handleChange('tipo_movimento', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de movimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ENTRADA">Entradas</SelectItem>
              <SelectItem value="SAIDA">Saídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select 
            value={localFiltros.status || 'TODOS'} 
            onValueChange={(value) => handleChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PREVISTO">Previsto</SelectItem>
              <SelectItem value="REALIZADO">Realizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Fluxo</Label>
          <Select 
            value={localFiltros.tipo_fluxo || 'TODOS'} 
            onValueChange={(value) => handleChange('tipo_fluxo', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de fluxo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="OPERACIONAL">Operacional</SelectItem>
              <SelectItem value="INVESTIMENTO">Investimento</SelectItem>
              <SelectItem value="FINANCIAMENTO">Financiamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="flex-1"
            >
              <Filter className="h-4 w-4 mr-2" />
              Limpar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Botões de exportação */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          {movimentacoes.length} movimentação(ões) encontrada(s)
        </div>
        <FluxoCaixaExportButtons
          movimentacoes={movimentacoes}
          resumo={resumo}
          filtros={filtros}
          disabled={isLoading}
        />
      </div>

      {/* Filtros aplicados */}
      <div className="flex flex-wrap gap-2 text-sm">
        {filtros.data_inicio && (
          <span className="px-2 py-1 bg-muted rounded">
            De: {new Date(filtros.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}
        {filtros.data_fim && (
          <span className="px-2 py-1 bg-muted rounded">
            Até: {new Date(filtros.data_fim + 'T00:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}
        {filtros.tipo_movimento && filtros.tipo_movimento !== 'TODOS' && (
          <span className="px-2 py-1 bg-muted rounded">
            {filtros.tipo_movimento}
          </span>
        )}
        {filtros.status && filtros.status !== 'TODOS' && (
          <span className="px-2 py-1 bg-muted rounded">
            {filtros.status}
          </span>
        )}
        {filtros.busca && (
          <span className="px-2 py-1 bg-muted rounded">
            Busca: "{filtros.busca}"
          </span>
        )}
      </div>
    </div>
  );
};

export default FluxoCaixaFiltros;