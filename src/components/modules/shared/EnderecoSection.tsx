import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export interface EnderecoValue {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
  [key: string]: any;
}

export interface EnderecoSectionProps {
  endereco: EnderecoValue | undefined;
  /** Atualiza um campo do endereço (exceto CEP). */
  onFieldChange: (field: keyof EnderecoValue, value: string) => void;
  /** Recebe o valor bruto do CEP e dispara o lookup externo. */
  onCepChange: (value: string) => void;
  /** Exibe o campo "País" (usado no FormCliente). */
  showPais?: boolean;
  /** Exibe spinner ao lado do input de CEP durante lookup externo. */
  loadingCep?: boolean;
}

/**
 * Seção de Endereço compartilhada entre FormCliente e FormFornecedor.
 * A lógica de consulta ao CEP permanece no formulário pai — este componente
 * apenas propaga o valor via `onCepChange` para não alterar o comportamento.
 */
export const EnderecoSection: React.FC<EnderecoSectionProps> = ({
  endereco,
  onFieldChange,
  onCepChange,
  showPais = false,
  loadingCep = false,
}) => {
  const e = endereco ?? {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Endereço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                value={e.cep || ''}
                onChange={(ev) => onCepChange(ev.target.value)}
                placeholder="00000-000"
              />
              {loadingCep && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
              )}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input
              id="logradouro"
              value={e.logradouro || ''}
              onChange={(ev) => onFieldChange('logradouro', ev.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={e.numero || ''}
              onChange={(ev) => onFieldChange('numero', ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              value={e.complemento || ''}
              onChange={(ev) => onFieldChange('complemento', ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={e.bairro || ''}
              onChange={(ev) => onFieldChange('bairro', ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf">UF</Label>
            <Input
              id="uf"
              value={e.uf || ''}
              onChange={(ev) => onFieldChange('uf', ev.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
        </div>

        {showPais ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={e.cidade || ''}
                onChange={(ev) => onFieldChange('cidade', ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input
                id="pais"
                value={e.pais || 'Brasil'}
                onChange={(ev) => onFieldChange('pais', ev.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={e.cidade || ''}
              onChange={(ev) => onFieldChange('cidade', ev.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
