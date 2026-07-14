import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2 } from 'lucide-react';

export type TipoCliente = 'F' | 'J';

export interface TipoClienteSelectorProps {
  value: TipoCliente;
  onChange: (tipo: TipoCliente) => void;
}

/**
 * Seletor de tipo de cliente (Pessoa Física / Pessoa Jurídica).
 * Extraído de FormCliente para permitir teste isolado.
 * Mantém o mesmo layout e classes de estilo do componente original.
 */
export const TipoClienteSelector: React.FC<TipoClienteSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Tipo de Cliente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={value === 'F' ? 'default' : 'outline'}
            onClick={() => onChange('F')}
            className="flex-1 h-12 transition-all duration-200"
            aria-pressed={value === 'F'}
          >
            <Users className="mr-2 h-4 w-4" />
            Pessoa Física
          </Button>
          <Button
            type="button"
            variant={value === 'J' ? 'default' : 'outline'}
            onClick={() => onChange('J')}
            className="flex-1 h-12 transition-all duration-200"
            aria-pressed={value === 'J'}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Pessoa Jurídica
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
