import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FiltrosMovimentacoes, TipoMovimentacao } from '@/types/movimentacoesBancarias';
import { Search, Filter, X } from 'lucide-react';

interface ContaOption {
  value: string;
  label: string;
  conta: any;
}

interface MovimentacoesBancariasFiltersProps {
  filtros: FiltrosMovimentacoes;
  contasOptions: ContaOption[];
  onFiltrosChange: (filtros: FiltrosMovimentacoes) => void;
}

export function MovimentacoesBancariasFilters({
  filtros,
  contasOptions,
  onFiltrosChange,
}: MovimentacoesBancariasFiltersProps) {
  
  const updateFiltro = (key: keyof FiltrosMovimentacoes, value: any) => {
    onFiltrosChange({
      ...filtros,
      [key]: value,
    });
  };

  const clearFiltros = () => {
    onFiltrosChange({});
  };

  const tiposMovimentacao: { value: TipoMovimentacao | 'TODOS'; label: string }[] = [
    { value: 'TODOS', label: 'Todos os tipos' },
    { value: 'DEPOSITO', label: 'Depósitos' },
    { value: 'SAQUE', label: 'Saques' },
    { value: 'TRANSFERENCIA_SAIDA', label: 'Transferências de Saída' },
    { value: 'TRANSFERENCIA_ENTRADA', label: 'Transferências de Entrada' },
    { value: 'AJUSTE_POSITIVO', label: 'Ajustes Positivos' },
    { value: 'AJUSTE_NEGATIVO', label: 'Ajustes Negativos' },
  ];

  const hasActiveFilters = Object.values(filtros).some(value => 
    value !== undefined && value !== '' && value !== 'TODOS'
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFiltros}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Busca */}
          <div className="col-span-full lg:col-span-2">
            <Label htmlFor="busca">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="busca"
                placeholder="Descrição, observações ou documento..."
                value={filtros.busca || ''}
                onChange={(e) => updateFiltro('busca', e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Conta Bancária */}
          <div>
            <Label htmlFor="conta">Conta Bancária</Label>
            <Select
              value={filtros.conta_bancaria_id || 'todas'}
              onValueChange={(value) => 
                updateFiltro('conta_bancaria_id', value === 'todas' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {contasOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Movimentação */}
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              value={filtros.tipo_movimentacao || 'TODOS'}
              onValueChange={(value) => 
                updateFiltro('tipo_movimentacao', value === 'TODOS' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposMovimentacao.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Início */}
          <div>
            <Label htmlFor="data-inicio">Data Início</Label>
            <Input
              id="data-inicio"
              type="date"
              value={filtros.data_inicio || ''}
              onChange={(e) => updateFiltro('data_inicio', e.target.value)}
            />
          </div>

          {/* Data Fim */}
          <div>
            <Label htmlFor="data-fim">Data Fim</Label>
            <Input
              id="data-fim"
              type="date"
              value={filtros.data_fim || ''}
              onChange={(e) => updateFiltro('data_fim', e.target.value)}
            />
          </div>

          {/* Valor Mínimo */}
          <div>
            <Label htmlFor="valor-min">Valor Mínimo</Label>
            <Input
              id="valor-min"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={filtros.valor_min || ''}
              onChange={(e) => updateFiltro('valor_min', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>

          {/* Valor Máximo */}
          <div>
            <Label htmlFor="valor-max">Valor Máximo</Label>
            <Input
              id="valor-max"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={filtros.valor_max || ''}
              onChange={(e) => updateFiltro('valor_max', e.target.value ? parseFloat(e.target.value) : undefined)}
            />
          </div>

          {/* Documento */}
          <div>
            <Label htmlFor="documento">Documento</Label>
            <Input
              id="documento"
              placeholder="Número do documento"
              value={filtros.documento_referencia || ''}
              onChange={(e) => updateFiltro('documento_referencia', e.target.value)}
            />
          </div>

          {/* Checkboxes */}
          <div className="col-span-full flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="conciliado"
                checked={filtros.conciliado === true}
                onCheckedChange={(checked) => 
                  updateFiltro('conciliado', checked ? true : undefined)
                }
              />
              <Label htmlFor="conciliado">Apenas conciliadas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="nao-conciliado"
                checked={filtros.conciliado === false}
                onCheckedChange={(checked) => 
                  updateFiltro('conciliado', checked ? false : undefined)
                }
              />
              <Label htmlFor="nao-conciliado">Apenas não conciliadas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="estornado"
                checked={filtros.estornado === true}
                onCheckedChange={(checked) => 
                  updateFiltro('estornado', checked ? true : undefined)
                }
              />
              <Label htmlFor="estornado">Apenas estornadas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluir-inativos"
                checked={filtros.incluir_inativos === true}
                onCheckedChange={(checked) => 
                  updateFiltro('incluir_inativos', checked ? true : undefined)
                }
              />
              <Label htmlFor="incluir-inativos">Incluir excluídas</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}