
import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AgenciaFilters } from '@/types/agencia';
import { useBancos } from '@/hooks/useBancos';

interface AgenciasFiltrosProps {
  onFilter: (filtros: AgenciaFilters) => void;
}

export const AgenciasFilters: React.FC<AgenciasFiltrosProps> = ({ onFilter }) => {
  console.log('[AgenciasFilters] Componente renderizado');

  const [filtros, setFiltros] = useState<AgenciaFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { bancos } = useBancos({ ativo: true });

  useEffect(() => {
    console.log('[AgenciasFilters] Filtros alterados:', filtros);
    onFilter(filtros);
  }, [filtros, onFilter]);

  const handleLimparFiltros = () => {
    console.log('[AgenciasFilters] Limpando filtros');
    setFiltros({});
  };

  const temFiltrosAtivos = Object.keys(filtros).some(key => 
    filtros[key as keyof AgenciaFilters] !== undefined && 
    filtros[key as keyof AgenciaFilters] !== ''
  );

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número da agência..."
                value={filtros.numero_agencia || ''}
                onChange={(e) => setFiltros(prev => ({ ...prev, numero_agencia: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {temFiltrosAtivos && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full w-2 h-2" />
              )}
            </Button>
            
            {temFiltrosAtivos && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="banco-select">Banco</Label>
              <Select
                value={filtros.banco_id || 'all'}
                onValueChange={(value) => 
                  setFiltros(prev => ({ 
                    ...prev, 
                    banco_id: value === 'all' ? undefined : value 
                  }))
                }
              >
                <SelectTrigger id="banco-select">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {bancos.map((banco) => (
                    <SelectItem key={banco.id} value={banco.id}>
                      {banco.sigla ? `${banco.sigla} - ${banco.nome}` : banco.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-select">Status</Label>
              <Select
                value={
                  filtros.ativo === true ? 'ativo' : 
                  filtros.ativo === false ? 'inativo' : 'all'
                }
                onValueChange={(value) => 
                  setFiltros(prev => ({ 
                    ...prev, 
                    ativo: value === 'all' ? undefined : value === 'ativo' 
                  }))
                }
              >
                <SelectTrigger id="status-select">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="incluir-arquivadas"
                checked={filtros.incluirArquivadas || false}
                onCheckedChange={(checked) => 
                  setFiltros(prev => ({ ...prev, incluirArquivadas: checked }))
                }
              />
              <Label htmlFor="incluir-arquivadas" className="text-sm">
                Incluir arquivadas
              </Label>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
