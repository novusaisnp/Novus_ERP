
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ContasPagarHeaderProps {
  onCreateClick: () => void;
}

export const ContasPagarHeader = ({ onCreateClick }: ContasPagarHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">
          Contas a Pagar
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas contas a pagar e compromissos financeiros
        </p>
      </div>
      <Button onClick={onCreateClick} className="gap-2">
        <Plus className="w-4 h-4" />
        Nova Conta a Pagar
      </Button>
    </div>
  );
};
