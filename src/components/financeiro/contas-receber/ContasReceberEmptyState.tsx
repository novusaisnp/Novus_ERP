import { Button } from '@/components/ui/button';
import { Plus, Receipt } from 'lucide-react';

interface ContasReceberEmptyStateProps {
  onCreateClick: () => void;
}

export const ContasReceberEmptyState = ({ onCreateClick }: ContasReceberEmptyStateProps) => {
  console.log('[ContasReceberEmptyState] Renderizando estado vazio');

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
        <Receipt className="w-8 h-8 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        Nenhuma conta a receber encontrada
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Comece criando sua primeira conta a receber ou ajuste os filtros de busca 
        para encontrar contas existentes.
      </p>
      
      <Button onClick={onCreateClick}>
        <Plus className="w-4 h-4 mr-2" />
        Criar Primeira Conta a Receber
      </Button>
    </div>
  );
};