import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calculator } from 'lucide-react';
import { Produto } from '@/types/produto';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
  onCalcularMargem: () => void;
  onCalcularPrecoVenda: () => void;
}

export const PrecosSection: React.FC<Props> = ({
  formData, onChange, onCalcularMargem, onCalcularPrecoVenda,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Tabela de Preços</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco_custo">Preço de Custo</Label>
          <CurrencyInput
            id="preco_custo"
            value={formData.preco_custo ?? 0}
            onValueChange={(v) => onChange('preco_custo', v || undefined)}
            onBlur={onCalcularMargem}
            placeholder="R$ 0,00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preco_venda">Preço de Venda *</Label>
          <CurrencyInput
            id="preco_venda"
            data-testid="produto-preco-venda-input"
            value={formData.preco_venda}
            onValueChange={(v) => onChange('preco_venda', v)}
            onBlur={onCalcularMargem}
            placeholder="R$ 0,00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
          <div className="flex gap-2">
            <Input
              id="margem_lucro"
              type="number"
              step="0.01"
              value={formData.margem_lucro ?? ''}
              onChange={(e) => onChange('margem_lucro', e.target.value ? parseFloat(e.target.value) : undefined)}
              onBlur={onCalcularPrecoVenda}
            />
            <Button type="button" variant="outline" size="sm" onClick={onCalcularMargem}>
              <Calculator className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
