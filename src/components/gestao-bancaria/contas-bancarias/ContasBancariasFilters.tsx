
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAgencias } from '@/hooks/useAgencias';
import { useBancos } from '@/hooks/useBancos';
import { ContaBancariaFilters } from '@/types/contaBancaria';
import { Search, Filter, X } from 'lucide-react';

interface ContasBancariasFiltersProps {
  onFilter: (filtros: ContaBancariaFilters) => void;
}

export const ContasBancariasFilters = ({ onFilter }: ContasBancariasFiltersProps) => {
  const [filtros, setFiltros] = useState<ContaBancariaFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const { agencias } = useAgencias();
  const { bancos } = useBancos();

  const handleFilterChange = (key: keyof ContaBancariaFilters, value: any) => {
    const novosFiltros = { ...filtros, [key]: value };
    setFiltros(novosFiltros);
    onFilter(novosFiltros);
  };

  const clearFilters = () => {
    setFiltros({});
    onFilter({});
  };

  const hasActiveFilters = Object.values(filtros).some(value => 
    value !== undefined && value !== '' && value !== 'all'
  );

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros</span>
            {hasActiveFilters && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                Ativo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Limpar todos os filtros"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            >
              {showFilters ? "Ocultar" : "Mostrar"}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filter-numero-conta">Número da Conta</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-numero-conta"
                  placeholder="Buscar por número..."
                  value={filtros.numero_conta || ''}
                  onChange={(e) => handleFilterChange('numero_conta', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-titular">Titular</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-titular"
                  placeholder="Buscar por titular..."
                  value={filtros.titular || ''}
                  onChange={(e) => handleFilterChange('titular', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-tipo-conta">Tipo de Conta</Label>
              <Select
                value={filtros.tipo_conta || 'all'}
                onValueChange={(value) => handleFilterChange('tipo_conta', value)}
              >
                <SelectTrigger id="filter-tipo-conta">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="CORRENTE">Conta Corrente</SelectItem>
                  <SelectItem value="POUPANCA">Conta Poupança</SelectItem>
                  <SelectItem value="INVESTIMENTO">Conta Investimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select
                value={filtros.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="INATIVA">Inativa</SelectItem>
                  <SelectItem value="BLOQUEADA">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-agencia">Agência</Label>
              <Select
                value={filtros.agencia_id || 'all'}
                onValueChange={(value) => handleFilterChange('agencia_id', value)}
              >
                <SelectTrigger id="filter-agencia">
                  <SelectValue placeholder="Todas as agências" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as agências</SelectItem>
                  {agencias?.map((agencia) => (
                    <SelectItem key={agencia.id} value={agencia.id}>
                      {agencia.numero_agencia} - {agencia.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-banco">Banco</Label>
              <Select
                value={filtros.banco_id || 'all'}
                onValueChange={(value) => handleFilterChange('banco_id', value)}
              >
                <SelectTrigger id="filter-banco">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {bancos?.map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.codigo} - {banco.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="filter-conta-cofre"
                checked={filtros.conta_cofre || false}
                onCheckedChange={(checked) => handleFilterChange('conta_cofre', checked)}
              />
              <Label htmlFor="filter-conta-cofre">Apenas Contas Cofre</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="filter-incluir-arquivadas"
                checked={filtros.incluir_arquivadas || false}
                onCheckedChange={(checked) => handleFilterChange('incluir_arquivadas', checked)}
              />
              <Label htmlFor="filter-incluir-arquivadas">Incluir Arquivadas</Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
