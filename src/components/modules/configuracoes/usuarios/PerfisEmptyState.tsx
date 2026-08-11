
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Settings, Plus } from 'lucide-react';

interface PerfisEmptyStateProps {
  onAdd: () => void;
}

const PerfisEmptyState: React.FC<PerfisEmptyStateProps> = ({ onAdd }) => {
  return (
    <div className="col-span-full">
      <EmptyState
        icon={Settings}
        title="Perfis do Sistema"
        description="Os perfis padrão do sistema estão disponíveis. Você pode criar perfis personalizados com permissões específicas conforme necessário."
        action={{
          label: 'Criar Perfil Personalizado',
          onClick: onAdd,
          icon: Plus,
        }}
      />
    </div>
  );
};

export default PerfisEmptyState;
