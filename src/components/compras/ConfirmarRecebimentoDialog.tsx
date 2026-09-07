import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useLocalizacoes } from '@/hooks/useLocalizacoes';
import { QuickAddLocalizacao } from '@/components/shared/QuickAddLookups';
import { useToast } from '@/hooks/use-toast';
import type { PedidoCompra } from '@/types/pedidoCompra';
import type { ConfirmarRecebimentoItemInput } from '@/types/recebimentoCompra';

interface Props {
  pedido: PedidoCompra;
  jaRecebidoPorItem: Record<string, number>;
  nomeProduto: (produtoId: string) => string;
  open: boolean;
  onClose: () => void;
  onConfirm: (itens: ConfirmarRecebimentoItemInput[], observacoes?: string) => Promise<void>;
  isConfirming: boolean;
}

export const ConfirmarRecebimentoDialog: React.FC<Props> = ({
  pedido, jaRecebidoPorItem, nomeProduto, open, onClose, onConfirm, isConfirming,
}) => {
  const { data: localizacoes = [] } = useLocalizacoes();
  const { toast } = useToast();
  const [localizacaoId, setLocalizacaoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});

  const itensPendentes = useMemo(
    () => pedido.itens
      .map((it) => ({ ...it, restante: Number(it.quantidade) - (jaRecebidoPorItem[it.id] || 0) }))
      .filter((it) => it.restante > 0),
    [pedido.itens, jaRecebidoPorItem]
  );

  const reset = () => { setLocalizacaoId(''); setObservacoes(''); setQuantidades({}); };

  const handleSubmit = async () => {
    if (!localizacaoId) {
      toast({ title: 'Selecione a localização de destino', variant: 'destructive' });
      return;
    }
    const itens: ConfirmarRecebimentoItemInput[] = [];
    for (const it of itensPendentes) {
      const raw = quantidades[it.id];
      if (raw === undefined || raw === '') continue;
      const qtd = Number(raw);
      if (!qtd || qtd <= 0) {
        toast({ title: 'Quantidade inválida', description: `Item ${nomeProduto(it.produto_id)}: quantidade precisa ser maior que zero.`, variant: 'destructive' });
        return;
      }
      if (qtd > it.restante) {
        toast({ title: 'Quantidade excede o pendente', description: `Item ${nomeProduto(it.produto_id)}: falta receber apenas ${it.restante}.`, variant: 'destructive' });
        return;
      }
      itens.push({ pedido_item_id: it.id, quantidade_recebida: qtd, localizacao_destino_id: localizacaoId });
    }
    if (itens.length === 0) {
      toast({ title: 'Informe a quantidade recebida de ao menos um item', variant: 'destructive' });
      return;
    }
    await onConfirm(itens, observacoes || undefined);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar Recebimento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Localização de destino *</Label>
            <div className="flex gap-2">
              <Select value={localizacaoId} onValueChange={setLocalizacaoId}>
                <SelectTrigger><SelectValue placeholder="Selecione onde o material foi guardado..." /></SelectTrigger>
                <SelectContent>
                  {localizacoes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <QuickAddLocalizacao onCreated={({ id }) => setLocalizacaoId(id)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Itens</Label>
            <div className="border rounded-md divide-y">
              {itensPendentes.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{nomeProduto(it.produto_id)}</div>
                    <div className="text-xs text-muted-foreground">Pendente: {it.restante} de {it.quantidade}</div>
                  </div>
                  <Input
                    type="number" step="0.001" min="0" max={it.restante}
                    className="w-32"
                    placeholder="0"
                    value={quantidades[it.id] ?? ''}
                    onChange={(e) => setQuantidades((prev) => ({ ...prev, [it.id]: e.target.value }))}
                  />
                </div>
              ))}
              {itensPendentes.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Todos os itens já foram recebidos.</div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2} placeholder="Nota fiscal, condição da entrega, etc." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isConfirming}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isConfirming || itensPendentes.length === 0}>
            {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Recebimento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
