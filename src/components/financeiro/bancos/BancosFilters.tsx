
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X } from 'lucide-react';

interface BancosFiltersProps {
  onFilter: (filtros: {
    codigo?: string;
    nome?: string;
    pais?: string;
    ativo?: boolean;
    incluirArquivados?: boolean;
  }) => void;
}

export const BancosFilters = ({ onFilter }: BancosFiltersProps) => {
  const [filtros, setFiltros] = useState({
    codigo: '',
    nome: '',
    pais: '',
    ativo: undefined as boolean | undefined,
    incluirArquivados: false,
  });

  const handleFilter = () => {
    const filtrosLimpos = {
      ...(filtros.codigo && { codigo: filtros.codigo }),
      ...(filtros.nome && { nome: filtros.nome }),
      ...(filtros.pais && { pais: filtros.pais }),
      ...(filtros.ativo !== undefined && { ativo: filtros.ativo }),
      incluirArquivados: filtros.incluirArquivados,
    };

    console.log('[Bancos] Aplicando filtros:', filtrosLimpos);
    onFilter(filtrosLimpos);
  };

  const limparFiltros = () => {
    const filtrosLimpos = {
      codigo: '',
      nome: '',
      pais: '',
      ativo: undefined as boolean | undefined,
      incluirArquivados: false,
    };
    setFiltros(filtrosLimpos);
    onFilter({});
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            placeholder="Ex: 001, 341..."
            value={filtros.codigo}
            onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="nome">Nome do Banco</Label>
          <Input
            id="nome"
            placeholder="Ex: Banco do Brasil..."
            value={filtros.nome}
            onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="pais">País</Label>
          <Input
            id="pais"
            placeholder="Ex: Brasil, Argentina..."
            value={filtros.pais}
            onChange={(e) => setFiltros({ ...filtros, pais: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={filtros.ativo === undefined ? 'all' : filtros.ativo ? 'ativo' : 'inativo'}
            onValueChange={(value) =>
              setFiltros({
                ...filtros,
                ativo: value === 'all' ? undefined : value === 'ativo',
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="incluir-arquivados"
            checked={filtros.incluirArquivados}
            onCheckedChange={(checked) =>
              setFiltros({ ...filtros, incluirArquivados: checked })
            }
          />
          <Label htmlFor="incluir-arquivados">Incluir bancos arquivados</Label>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handleFilter}
            className="flex-1 sm:flex-none"
            size="sm"
          >
            <Search className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button
            onClick={limparFiltros}
            variant="outline"
            className="flex-1 sm:flex-none"
            size="sm"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>
    </div>
  );
};
