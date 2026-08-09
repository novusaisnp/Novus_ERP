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
        <div className="inline-flex w-fit gap-0.5 rounded-md border bg-muted p-0.5">
          <Button
            type="button"
            variant={value === 'F' ? 'default' : 'outline'}
            onClick={() => onChange('F')}
            className="h-9 px-4 border-0 transition-all duration-200"
            aria-pressed={value === 'F'}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Pessoa Física
          </Button>
          <Button
            type="button"
            variant={value === 'J' ? 'default' : 'outline'}
            onClick={() => onChange('J')}
            className="h-9 px-4 border-0 transition-all duration-200"
            aria-pressed={value === 'J'}
          >
            <Building2 className="mr-1.5 h-3.5 w-3.5" />
            Pessoa Jurídica
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
