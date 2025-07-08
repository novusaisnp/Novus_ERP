
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, X } from 'lucide-react';
import { useFornecedores } from '@/hooks/useFornecedores';
import type { ContaPagarFilters } from '@/types/contasPagar';

interface ContasPagarFiltersProps {
  onFilter: (filtros: ContaPagarFilters) => void;
}

export const ContasPagarFilters = ({ onFilter }: ContasPagarFiltersProps) => {
  const [filtros, setFiltros] = useState<ContaPagarFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { fornecedores } = useFornecedores();

  const handleFilterChange = (key: keyof ContaPagarFilters, value: any) => {
    const novosFiltros = { ...filtros, [key]: value || undefined };
    setFiltros(novosFiltros);
    onFilter(novosFiltros);
  };

  const clearFilters = () => {
    setFiltros({});
    onFilter({});
  };

  const hasActiveFilters = Object.values(filtros).some(value => value !== undefined && value !== '');

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filtro de busca sempre visível */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número do documento ou descrição..."
            value={filtros.busca || ''}
            onChange={(e) => handleFilterChange('busca', e.target.value)}
            className="pl-10"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="situacao">Situação</Label>
              <Select
                value={filtros.situacao || ''}
                onValueChange={(value) => handleFilterChange('situacao', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as situações</SelectItem>
                  <SelectItem value="ABERTA">Aberta</SelectItem>
                  <SelectItem value="VENCIDA">Vencida</SelectItem>
                  <SelectItem value="PAGA">Paga</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select
                value={filtros.fornecedor_id || ''}
                onValueChange={(value) => handleFilterChange('fornecedor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os fornecedores</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id!}>
                      {fornecedor.razaoSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="data_inicio">Vencimento (de)</Label>
              <Input
                id="data_inicio"
                type="date"
                value={filtros.data_vencimento_inicio || ''}
                onChange={(e) => handleFilterChange('data_vencimento_inicio', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="data_fim">Vencimento (até)</Label>
              <Input
                id="data_fim"
                type="date"
                value={filtros.data_vencimento_fim || ''}
                onChange={(e) => handleFilterChange('data_vencimento_fim', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="valor_min">Valor mínimo</Label>
              <Input
                id="valor_min"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filtros.valor_min || ''}
                onChange={(e) => handleFilterChange('valor_min', parseFloat(e.target.value) || undefined)}
              />
            </div>

            <div>
              <Label htmlFor="valor_max">Valor máximo</Label>
              <Input
                id="valor_max"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filtros.valor_max || ''}
                onChange={(e) => handleFilterChange('valor_max', parseFloat(e.target.value) || undefined)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
