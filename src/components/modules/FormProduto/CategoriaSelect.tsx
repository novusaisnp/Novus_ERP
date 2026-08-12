import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { QuickAddCategoria } from '@/components/shared/QuickAddCategoria';

export type CategoriaOption = {
  id: string;
  nome: string;
  ativo?: boolean;
  plano_conta_receita_id?: string | null;
  plano_conta_despesa_id?: string | null;
};

interface CategoriaSelectProps {
  categorias: CategoriaOption[];
  categoriaId: string | null;
  onChange: (id: string | null) => void;
}

export const CategoriaSelect: React.FC<CategoriaSelectProps> = ({
  categorias, categoriaId, onChange,
}) => {
  const selecionada = useMemo(
    () => categorias.find((c) => c.id === categoriaId),
    [categorias, categoriaId],
  );
  const classificacaoCompleta =
    !!selecionada?.plano_conta_receita_id && !!selecionada?.plano_conta_despesa_id;

  return (
    <div className="space-y-2">
      <Label htmlFor="categoria_id">Categoria</Label>
      <div className="flex gap-2">
      <Select
        value={categoriaId ?? '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      >
        <SelectTrigger id="categoria_id">
          <SelectValue placeholder="Selecione uma categoria..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sem categoria</SelectItem>
          {categorias.map((c) => {
            const completa =
              !!c.plano_conta_receita_id && !!c.plano_conta_despesa_id;
            return (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
                {!c.ativo && ' (rascunho)'}
                {!completa && c.ativo && ' — sem classificação'}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
        <QuickAddCategoria onCreated={({ id }) => onChange(id)} />
      </div>

      {!categoriaId && (
        <div className="flex items-start gap-2 rounded-md border border-status-production/50 bg-status-production/10 p-2 text-xs text-status-production">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Produto sem categoria não terá classificação contábil automática.</span>
        </div>
      )}

      {selecionada && (
        <div className="rounded-md border p-3 space-y-1 text-xs bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="font-medium">Classificação Contábil Herdada</span>
            <Badge variant={classificacaoCompleta ? 'default' : 'outline'}>
              {classificacaoCompleta ? 'Completa' : 'Pendente na categoria'}
            </Badge>
          </div>
          <div className="text-muted-foreground">
            Receita: {selecionada.plano_conta_receita_id ? '✓ vinculada' : '— não definida na categoria'}
          </div>
          <div className="text-muted-foreground">
            Despesa: {selecionada.plano_conta_despesa_id ? '✓ vinculada' : '— não definida na categoria'}
          </div>
        </div>
      )}
    </div>
  );
};
