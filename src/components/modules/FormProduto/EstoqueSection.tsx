import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Produto } from '@/types/produto';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

export const EstoqueSection: React.FC<Props> = ({ formData, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle>Controle de Estoque</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estoque_atual">Estoque Atual</Label>
          <Input
            id="estoque_atual"
            type="number"
            value={formData.estoque_atual ?? 0}
            onChange={(e) => onChange('estoque_atual', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
          <Input
            id="estoque_minimo"
            type="number"
            value={formData.estoque_minimo ?? 0}
            onChange={(e) => onChange('estoque_minimo', parseInt(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estoque_maximo">Estoque Máximo</Label>
          <Input
            id="estoque_maximo"
            type="number"
            value={formData.estoque_maximo ?? ''}
            onChange={(e) => onChange('estoque_maximo', e.target.value ? parseInt(e.target.value) : undefined)}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);
