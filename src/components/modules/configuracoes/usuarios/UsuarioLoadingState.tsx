
import React from 'react';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

const UsuarioLoadingState: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="p-8 text-center">
        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Carregando dados...</h3>
        <p className="text-muted-foreground">
          Aguarde enquanto carregamos as informações de empresas e perfis.
        </p>
      </Card>
    </div>
  );
};

export default UsuarioLoadingState;
