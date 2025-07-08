
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

interface ContasPagarEmptyStateProps {
  onCreateClick: () => void;
}

export const ContasPagarEmptyState = ({ onCreateClick }: ContasPagarEmptyStateProps) => {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          Nenhuma conta a pagar encontrada
        </h3>
        <p className="text-gray-600 mb-4">
          Comece adicionando sua primeira conta a pagar para gerenciar seus compromissos financeiros
        </p>
        <Button onClick={onCreateClick} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Primeira Conta
        </Button>
      </CardContent>
    </Card>
  );
};
