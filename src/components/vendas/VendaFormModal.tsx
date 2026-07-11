import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { Venda, ItemVenda, VendaStatus } from '@/types/vendas';
import { vendasService } from '@/services/vendasService';
import { clienteService } from '@/services/clienteService';
import { planosPagamentoService } from '@/services/configBasicasService';
import { useVendas } from '@/hooks/useVendas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venda?: Venda | null;
}

const STATUS: VendaStatus[] = ['RASCUNHO', 'CONFIRMADO', 'EM_PRODUCAO', 'FATURADO', 'ENTREGUE', 'CANCELADO'];

const emptyItem = (): ItemVenda => ({
  descricao: '',
  quantidade: 1,
  preco_unitario: 0,
  desconto_item: 0,
  acrescimo_item: 0,
});

export const VendaFormModal: React.FC<Props> = ({ open, onOpenChange, venda }) => {
  const { saveVenda, saving } = useVendas();
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clienteService.fetchClientes });
  const { data: planos = [] } = useQuery({ queryKey: ['planos-pagamento'], queryFn: planosPagamentoService.getAll });

  const [form, setForm] = useState<Venda>({
    data_venda: new Date().toISOString().slice(0, 10),
    status: 'RASCUNHO',
    desconto: 0,
    acrescimo: 0,
    valor_frete: 0,
    itens: [emptyItem()],
  });

  useEffect(() => {
    if (!open) return;
    if (venda) setForm({ ...venda, itens: venda.itens?.length ? venda.itens : [emptyItem()] });
    else
      setForm({
        data_venda: new Date().toISOString().slice(0, 10),
        status: 'RASCUNHO',
        desconto: 0,
        acrescimo: 0,
        valor_frete: 0,
        itens: [emptyItem()],
      });
  }, [open, venda]);

  const totais = useMemo(() => vendasService.calcTotais(form), [form]);

  const setField = <K extends keyof Venda>(k: K, v: Venda[K]) => setForm((p) => ({ ...p, [k]: v }));

  const updateItem = (idx: number, patch: Partial<ItemVenda>) =>
    setForm((p) => ({
      ...p,
      itens: (p.itens || []).map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const addItem = () => setForm((p) => ({ ...p, itens: [...(p.itens || []), emptyItem()] }));
  const removeItem = (idx: number) =>
    setForm((p) => ({ ...p, itens: (p.itens || []).filter((_, i) => i !== idx) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveVenda(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{venda?.id ? 'Editar Venda' : 'Nova Venda'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select
                value={form.cliente_id || ''}
                onValueChange={(v) => setField('cliente_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(clientes as any[])
                    .filter((c) => c.id && (c.ativo ?? true))
                    .map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data da Venda *</Label>
              <Input
                type="date"
                value={form.data_venda}
                onChange={(e) => setField('data_venda', e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v as VendaStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Entrega Prevista</Label>
              <Input
                type="date"
                value={form.data_entrega_prevista || ''}
                onChange={(e) => setField('data_entrega_prevista', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Plano de Pagamento</Label>
              <Select
                value={form.plano_pagamento_id || ''}
                onValueChange={(v) => setField('plano_pagamento_id', v)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                <SelectContent>
                  {(planos as any[]).filter((p) => p.id).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Itens da Venda</h4>
              <Button type="button" size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Item
              </Button>
            </div>
            <div className="space-y-2">
              {(form.itens || []).map((it, idx) => {
                const bruto = (Number(it.quantidade) || 0) * (Number(it.preco_unitario) || 0);
                const total = bruto - (Number(it.desconto_item) || 0) + (Number(it.acrescimo_item) || 0);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs">Descrição *</Label>
                      <Input
                        value={it.descricao}
                        onChange={(e) => updateItem(idx, { descricao: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={it.quantidade}
                        onChange={(e) => updateItem(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Preço Unit.</Label>
                      <CurrencyInput
                        value={it.preco_unitario}
                        onValueChange={(v) => updateItem(idx, { preco_unitario: v })}
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label className="text-xs">Desc.</Label>
                      <CurrencyInput
                        value={it.desconto_item || 0}
                        onValueChange={(v) => updateItem(idx, { desconto_item: v })}
                      />
                    </div>
                    <div className="col-span-10 md:col-span-1 text-sm">
                      <Label className="text-xs">Total</Label>
                      <div className="h-9 flex items-center font-medium">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {(form.itens || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum item adicionado</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Subtotal</Label>
              <Input value={(totais.subtotal || 0).toFixed(2)} readOnly disabled />
            </div>
            <div>
              <Label>Desconto</Label>
              <CurrencyInput
                value={form.desconto || 0}
                onValueChange={(v) => setField('desconto', v)}
              />
            </div>
            <div>
              <Label>Acréscimo</Label>
              <CurrencyInput
                value={form.acrescimo || 0}
                onValueChange={(v) => setField('acrescimo', v)}
              />
            </div>
            <div>
              <Label>Frete</Label>
              <CurrencyInput
                value={form.valor_frete || 0}
                onValueChange={(v) => setField('valor_frete', v)}
              />
            </div>
            <div className="col-span-2 md:col-span-4">
              <Label>Valor Total</Label>
              <Input
                value={(totais.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                readOnly disabled className="font-bold text-lg"
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes || ''}
              onChange={(e) => setField('observacoes', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
