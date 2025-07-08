import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ContasReceberHeaderProps {
  onCreateClick: () => void;
}

export const ContasReceberHeader = ({ onCreateClick }: ContasReceberHeaderProps) => {
  console.log('[ContasReceberHeader] Renderizando header');

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contas a Receber</h1>
        <p className="text-muted-foreground">
          Gerencie todas as contas a receber de clientes e vendas
        </p>
      </div>
      
      <Button onClick={onCreateClick} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 mr-2" />
        Nova Conta a Receber
      </Button>
    </div>
  );
};