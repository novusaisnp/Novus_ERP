
import { Button } from '@/components/ui/button';
import { Plus, CreditCard } from 'lucide-react';

interface ContasBancariasHeaderProps {
  onCreateClick: () => void;
}

export const ContasBancariasHeader = ({ onCreateClick }: ContasBancariasHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Contas Bancárias
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas contas bancárias e contas cofre
          </p>
        </div>
      </div>
      
      <Button 
        onClick={onCreateClick} 
        className="flex items-center gap-2 whitespace-nowrap"
        aria-label="Criar nova conta bancária"
      >
        <Plus className="h-4 w-4" />
        Nova Conta
      </Button>
    </div>
  );
};
