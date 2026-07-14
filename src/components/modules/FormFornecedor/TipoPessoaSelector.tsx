import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, User } from 'lucide-react';
import { TipoPessoa } from '@/types/fornecedor';

export interface TipoPessoaSelectorProps {
  value: TipoPessoa | undefined;
  onChange: (tipo: TipoPessoa) => void;
}

/**
 * Seletor de tipo de pessoa (PJ / PF) para fornecedores.
 * Extraído de FormFornecedor para permitir teste isolado.
 */
export const TipoPessoaSelector: React.FC<TipoPessoaSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          Tipo de Fornecedor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={value}
          onValueChange={(next) => onChange(next as TipoPessoa)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PJ" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Pessoa Jurídica
            </TabsTrigger>
            <TabsTrigger value="PF" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pessoa Física
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
};
