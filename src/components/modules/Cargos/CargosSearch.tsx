
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface CargosSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export const CargosSearch: React.FC<CargosSearchProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Pesquisar cargos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
        </div>
      </CardContent>
    </Card>
  );
};
