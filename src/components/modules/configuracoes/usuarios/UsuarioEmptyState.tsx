
import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Users, Plus } from 'lucide-react';

interface UsuarioEmptyStateProps {
  hasUsuarios: boolean;
  onAddUsuario: () => void;
}

const UsuarioEmptyState: React.FC<UsuarioEmptyStateProps> = ({
  hasUsuarios,
  onAddUsuario
}) => {
  return (
    <div className="col-span-full">
      <EmptyState
        icon={Users}
        title={!hasUsuarios ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'}
        description={
          !hasUsuarios
            ? 'Cadastre os usuários que terão acesso ao sistema'
            : 'Tente ajustar os filtros para encontrar os usuários desejados'
        }
        action={!hasUsuarios ? { label: 'Cadastrar Primeiro Usuário', onClick: onAddUsuario, icon: Plus } : undefined}
      />
    </div>
  );
};

export default UsuarioEmptyState;
