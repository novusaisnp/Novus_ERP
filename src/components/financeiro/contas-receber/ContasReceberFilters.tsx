import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Filter, ChevronDown, X } from 'lucide-react';
import type { ContaReceberFilters } from '@/types/contasReceber';

interface ContasReceberFiltersProps {
  onFilter: (filtros: ContaReceberFilters) => void;
}

export const ContasReceberFilters = ({ onFilter }: ContasReceberFiltersProps) => {
  console.log('[ContasReceberFilters] Renderizando filtros');

  const [isOpen, setIsOpen] = useState(false);
  const [filtros, setFiltros] = useState<ContaReceberFilters>({});

  const handleInputChange = (field: keyof ContaReceberFilters, value: string | number) => {
    console.log('[ContasReceberFilters] Alterando filtro:', field, value);
    
    const novosFiltros = {
      ...filtros,
      [field]: value === '' ? undefined : value,
    };
    
    setFiltros(novosFiltros);
  };

  const handleSubmit = () => {
    console.log('[ContasReceberFilters] Aplicando filtros:', filtros);
    onFilter(filtros);
  };

  const handleClear = () => {
    console.log('[ContasReceberFilters] Limpando filtros');
    const filtrosLimpos = {};
    setFiltros(filtrosLimpos);
    onFilter(filtrosLimpos);
  };

  const hasActiveFilters = Object.values(filtros).some(value => 
    value !== undefined && value !== ''
  );

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros de Busca
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Ativos
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="busca">Busca Geral</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="busca"
                    placeholder="Documento, cliente..."
                    value={filtros.busca || ''}
                    onChange={(e) => handleInputChange('busca', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="situacao">Situação</Label>
                <Select 
                  value={filtros.situacao || '__ALL__'} 
                  onValueChange={(value) => handleInputChange('situacao', value === '__ALL__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as situações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas as situações</SelectItem>
                    <SelectItem value="ABERTA">Em Aberto</SelectItem>
                    <SelectItem value="RECEBIDA">Recebida</SelectItem>
                    <SelectItem value="VENCIDA">Vencida</SelectItem>
                    <SelectItem value="CANCELADA">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                <Select 
                  value={filtros.forma_pagamento || '__ALL__'} 
                  onValueChange={(value) => handleInputChange('forma_pagamento', value === '__ALL__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as formas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">Todas as formas</SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento_inicio">Vencimento (Início)</Label>
                <Input
                  id="data_vencimento_inicio"
                  type="date"
                  value={filtros.data_vencimento_inicio || ''}
                  onChange={(e) => handleInputChange('data_vencimento_inicio', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_vencimento_fim">Vencimento (Fim)</Label>
                <Input
                  id="data_vencimento_fim"
                  type="date"
                  value={filtros.data_vencimento_fim || ''}
                  onChange={(e) => handleInputChange('data_vencimento_fim', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_min">Valor Mínimo</Label>
                <Input
                  id="valor_min"
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={filtros.valor_min || ''}
                  onChange={(e) => handleInputChange('valor_min', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor_max">Valor Máximo</Label>
                <Input
                  id="valor_max"
                  type="number"
                  placeholder="0,00"
                  step="0.01"
                  value={filtros.valor_max || ''}
                  onChange={(e) => handleInputChange('valor_max', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
              <Button onClick={handleSubmit} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
              
              {hasActiveFilters && (
                <Button variant="outline" onClick={handleClear}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};