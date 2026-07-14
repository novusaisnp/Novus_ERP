import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Produto } from '@/types/produto';

interface Props {
  formData: Produto;
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

const parseNum = (v: string) => (v ? parseFloat(v) : undefined);

export const MedidasSection: React.FC<Props> = ({ formData, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle>Tamanhos e Medidas</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {([
          ['peso', 'Peso (kg)'],
          ['altura', 'Altura (cm)'],
          ['largura', 'Largura (cm)'],
          ['comprimento', 'Comprimento (cm)'],
        ] as const).map(([field, label]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              type="number"
              step="0.01"
              value={(formData[field] as number | undefined) ?? ''}
              onChange={(e) => onChange(field, parseNum(e.target.value) as Produto[typeof field])}
            />
          </div>
        ))}
      </div>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Dimensões usadas para cálculo de frete e logística.
      </p>
    </CardContent>
  </Card>
);
