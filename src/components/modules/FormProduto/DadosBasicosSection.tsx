import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Produto } from '@/types/produto';
import { CategoriaSelect, CategoriaOption } from './CategoriaSelect';

interface Props {
  formData: Produto;
  categorias: CategoriaOption[];
  onChange: <K extends keyof Produto>(field: K, value: Produto[K]) => void;
}

export const DadosBasicosSection: React.FC<Props> = ({ formData, categorias, onChange }) => (
  <Card>
    <CardHeader>
      <CardTitle>Informações Básicas</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Produto *</Label>
          <Input
            id="nome"
            data-testid="produto-nome-input"
            value={formData.nome}
            onChange={(e) => onChange('nome', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="codigo">Código</Label>
          <Input
            id="codigo"
            value={formData.codigo ?? ''}
            onChange={(e) => onChange('codigo', e.target.value || null)}
          />
        </div>
      </div>

      <CategoriaSelect
        categorias={categorias}
        categoriaId={formData.categoria_id ?? null}
        onChange={(id) => onChange('categoria_id', id)}
      />

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={formData.descricao ?? ''}
          onChange={(e) => onChange('descricao', e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ncm">NCM</Label>
          <Input
            id="ncm"
            value={formData.ncm ?? ''}
            onChange={(e) => onChange('ncm', e.target.value)}
            placeholder="00000000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cest">CEST</Label>
          <Input
            id="cest"
            value={formData.cest ?? ''}
            onChange={(e) => onChange('cest', e.target.value)}
            placeholder="0000000"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);
