import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Contrato, ContratoStatus } from '@/types/contratos';
import { clienteService } from '@/services/clienteService';
import { planosPagamentoService } from '@/services/configBasicasService';
import { useContratos } from '@/hooks/useContratos';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato?: Contrato | null;
}

const STATUS: ContratoStatus[] = ['RASCUNHO', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'CANCELADO'];

const empty = (): Contrato => ({
  titulo: '',
  status: 'RASCUNHO',
  renovacao_automatica: false,
  gera_financeiro: false,
});

export const ContratoFormModal: React.FC<Props> = ({ open, onOpenChange, contrato }) => {
  const { saveContrato, saving } = useContratos();
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: clienteService.fetchClientes });
  const { data: planos = [] } = useQuery({ queryKey: ['planos-pagamento'], queryFn: planosPagamentoService.getAll });

  const [form, setForm] = useState<Contrato>(empty());

  useEffect(() => {
    if (!open) return;
    setForm(contrato ? { ...contrato } : empty());
  }, [open, contrato]);

  const setField = <K extends keyof Contrato>(k: K, v: Contrato[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveContrato(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contrato?.id ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={(e) => setField('titulo', e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_id || ''} onValueChange={(v) => setField('cliente_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {(clientes as any[]).filter((c) => c.id && (c.ativo ?? true)).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField('status', v as ContratoStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={form.data_inicio || ''} onChange={(e) => setField('data_inicio', e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={form.data_fim || ''} onChange={(e) => setField('data_fim', e.target.value)} />
            </div>
            <div>
              <Label>Valor Mensal</Label>
              <CurrencyInput
                value={form.valor_mensal ?? 0}
                onValueChange={(v) => setField('valor_mensal', v)}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Dia Vencimento</Label>
              <Input
                type="number" min={1} max={31}
                value={form.dia_vencimento ?? ''}
                onChange={(e) => setField('dia_vencimento', parseInt(e.target.value) || 0)}
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

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="renov"
                checked={!!form.renovacao_automatica}
                onCheckedChange={(v) => setField('renovacao_automatica', v)}
              />
              <Label htmlFor="renov">Renovação automática</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="gera"
                checked={!!form.gera_financeiro}
                onCheckedChange={(v) => setField('gera_financeiro', v)}
              />
              <Label htmlFor="gera">Gera contas a receber</Label>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={form.descricao || ''} onChange={(e) => setField('descricao', e.target.value)} />
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
