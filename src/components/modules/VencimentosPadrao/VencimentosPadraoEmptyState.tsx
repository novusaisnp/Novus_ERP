
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Plus } from 'lucide-react';

interface VencimentosPadraoEmptyStateProps {
  searchTerm: string;
  onNovoVencimento: () => void;
}

export const VencimentosPadraoEmptyState: React.FC<VencimentosPadraoEmptyStateProps> = ({
  searchTerm,
  onNovoVencimento
}) => {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-gray-400 mx-auto" />
        </div>
        
        {searchTerm ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum vencimento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Não encontramos vencimentos que correspondam à sua busca por "{searchTerm}".
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum vencimento cadastrado
            </h3>
            <p className="text-gray-600 mb-4">
              Comece cadastrando o primeiro vencimento padrão da sua empresa.
            </p>
          </>
        )}
        
        <Button onClick={onNovoVencimento} className="flex items-center gap-2 mx-auto">
          <Plus className="w-4 h-4" />
          Cadastrar Vencimento
        </Button>
      </CardContent>
    </Card>
  );
};
