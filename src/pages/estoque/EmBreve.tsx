import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction, LucideIcon } from 'lucide-react';

interface EmBreveProps {
  titulo: string;
  descricao?: string;
  icon?: LucideIcon;
}

const EmBreve: React.FC<EmBreveProps> = ({
  titulo,
  descricao = 'Este módulo está em desenvolvimento e estará disponível em breve.',
  icon: Icon = Construction,
}) => {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">{titulo}</h1>
        <p className="text-muted-foreground">Módulo em construção</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Icon className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Em breve</h2>
          <p className="text-muted-foreground max-w-md">{descricao}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmBreve;
