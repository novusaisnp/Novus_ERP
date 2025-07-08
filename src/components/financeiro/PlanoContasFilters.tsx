
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Expand, Minimize } from 'lucide-react';

interface PlanoContasFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const PlanoContasFilters: React.FC<PlanoContasFiltersProps> = ({
  searchTerm,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contas..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExpandAll}>
          <Expand className="mr-2 h-4 w-4" />
          Expandir Tudo
        </Button>
        <Button variant="outline" size="sm" onClick={onCollapseAll}>
          <Minimize className="mr-2 h-4 w-4" />
          Recolher Tudo
        </Button>
      </div>
    </div>
  );
};
