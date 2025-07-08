
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Plus } from 'lucide-react';

interface PerfisEmptyStateProps {
  onAdd: () => void;
}

const PerfisEmptyState: React.FC<PerfisEmptyStateProps> = ({ onAdd }) => {
  return (
    <div className="col-span-full">
      <Card className="p-8 text-center">
        <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Perfis do Sistema</h3>
        <p className="text-muted-foreground mb-4">
          Os perfis padrão do sistema estão disponíveis. Você pode criar perfis personalizados com permissões específicas conforme necessário.
        </p>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Perfil Personalizado
        </Button>
      </Card>
    </div>
  );
};

export default PerfisEmptyState;
