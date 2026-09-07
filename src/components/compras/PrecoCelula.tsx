import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CotacaoCompraPreco } from '@/types/cotacaoCompra';
import { currencyUtils } from '@/utils/currencyUtils';

interface Props {
  preco: CotacaoCompraPreco | undefined;
  ehMenorPreco: boolean;
  podeEditar: boolean;
  isSalvando: boolean;
  onSalvar: (precoUnitario: number, prazoEntregaDias: number | null) => void;
  onMarcarVencedor: () => void;
}

export const PrecoCelula: React.FC<Props> = ({ preco, ehMenorPreco, podeEditar, isSalvando, onSalvar, onMarcarVencedor }) => {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(preco ? String(preco.preco_unitario) : '');
  const [prazo, setPrazo] = useState(preco?.prazo_entrega_dias != null ? String(preco.prazo_entrega_dias) : '');

  if (editando) {
    return (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <Input
          type="number" step="0.01" min={0.01} autoFocus
          value={valor} onChange={(e) => setValor(e.target.value)}
          placeholder="Preço" className="h-8 text-sm"
        />
        <Input
          type="number" min={0} value={prazo} onChange={(e) => setPrazo(e.target.value)}
          placeholder="Prazo (dias)" className="h-8 text-sm"
        />
        <div className="flex gap-1">
          <Button
            size="sm" className="h-7 text-xs flex-1" disabled={isSalvando || !valor}
            onClick={() => { onSalvar(Number(valor), prazo ? Number(prazo) : null); setEditando(false); }}
          >
            {isSalvando ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditando(false)}>×</Button>
        </div>
      </div>
    );
  }

  if (!preco) {
    return podeEditar ? (
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditando(true)}>+ Preço</Button>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    );
  }

  return (
    <div className={cn('rounded-md border p-2 min-w-[120px]', preco.vencedor && 'border-primary bg-primary/5', ehMenorPreco && !preco.vencedor && 'border-emerald-400')}>
      <div className="flex items-center gap-1">
        {preco.vencedor && <Star className="w-3 h-3 fill-primary text-primary shrink-0" />}
        <span className="font-medium text-sm">{currencyUtils.formatCurrency(preco.preco_unitario)}</span>
      </div>
      {preco.prazo_entrega_dias != null && <p className="text-xs text-muted-foreground">{preco.prazo_entrega_dias}d de prazo</p>}
      {podeEditar && (
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={() => setEditando(true)}>Editar</Button>
          {!preco.vencedor && (
            <Button size="sm" variant="ghost" className="h-6 text-xs px-1.5" onClick={onMarcarVencedor}>Vencedor</Button>
          )}
        </div>
      )}
    </div>
  );
};
