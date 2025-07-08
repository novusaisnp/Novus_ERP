
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus } from 'lucide-react';

interface BancoEmptyStateProps {
  onCreateClick: () => void;
}

export const BancoEmptyState = ({ onCreateClick }: BancoEmptyStateProps) => {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Building2 className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhum banco encontrado
        </h3>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          Comece cadastrando o primeiro banco da sua empresa. Você pode buscar 
          automaticamente na base de dados do Banco Central ou cadastrar manualmente.
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Primeiro Banco
        </Button>
      </CardContent>
    </Card>
  );
};
