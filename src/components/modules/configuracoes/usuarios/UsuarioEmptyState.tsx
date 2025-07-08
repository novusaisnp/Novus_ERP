
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {!hasUsuarios ? 'Nenhum usuário cadastrado' : 'Nenhum usuário encontrado'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {!hasUsuarios 
            ? 'Cadastre os usuários que terão acesso ao sistema'
            : 'Tente ajustar os filtros para encontrar os usuários desejados'
          }
        </p>
        {!hasUsuarios && (
          <Button onClick={onAddUsuario}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Primeiro Usuário
          </Button>
        )}
      </Card>
    </div>
  );
};

export default UsuarioEmptyState;
