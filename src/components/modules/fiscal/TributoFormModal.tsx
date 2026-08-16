import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tributo } from '@/types/fiscal';
import { useCreateTributo, useUpdateTributo } from '@/hooks/useFiscal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tributo?: Tributo | null;
}

const TIPOS: Tributo['tipo'][] = ['ICMS', 'IPI', 'PIS', 'COFINS', 'ISS', 'CSLL', 'IRPJ'];
const SUBTIPOS: NonNullable<Tributo['subtipo']>[] = ['normal', 'substituicao', 'diferido', 'isento'];

const empty = {
  descricao: '',
  tipo: 'ICMS' as Tributo['tipo'],
  subtipo: '' as Tributo['subtipo'] | '',
  aliquota: '0',
  baseCalculo: '100',
  uf: '',
  regimeTributario: '',
  ncmInicio: '',
  ncmFim: '',
  dataInicio: new Date().toISOString().slice(0, 10),
  dataFim: '',
  observacoes: '',
  ativo: true,
};

export const TributoFormModal: React.FC<Props> = ({ open, onOpenChange, tributo }) => {
  const [form, setForm] = useState(empty);
  const createMut = useCreateTributo();
  const updateMut = useUpdateTributo();
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (!open) return;
    if (tributo) {
      setForm({
        descricao: tributo.descricao,
        tipo: tributo.tipo,
        subtipo: tributo.subtipo ?? '',
        aliquota: String(tributo.aliquota),
        baseCalculo: String(tributo.baseCalculo),
        uf: tributo.uf ?? '',
        regimeTributario: tributo.regimeTributario ?? '',
        ncmInicio: tributo.ncmInicio ?? '',
        ncmFim: tributo.ncmFim ?? '',
        dataInicio: tributo.dataInicio,
        dataFim: tributo.dataFim ?? '',
        observacoes: tributo.observacoes ?? '',
        ativo: tributo.ativo,
      });
    } else {
      setForm(empty);
    }
  }, [open, tributo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      tipo: form.tipo,
      subtipo: form.subtipo || undefined,
      aliquota: parseFloat(form.aliquota) || 0,
      baseCalculo: parseFloat(form.baseCalculo) || 100,
      uf: form.uf || undefined,
      regimeTributario: form.regimeTributario || undefined,
      ncmInicio: form.ncmInicio || undefined,
      ncmFim: form.ncmFim || undefined,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || undefined,
      observacoes: form.observacoes || undefined,
      ativo: form.ativo,
    };
    try {
      if (tributo?.id) {
        await updateMut.mutateAsync({ id: tributo.id, input: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      /* toast tratado pelo hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tributo ? 'Editar tributo' : 'Novo tributo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              required
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as Tributo['tipo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subtipo</Label>
              <Select
                value={form.subtipo || '__none__'}
                onValueChange={(v) => setForm((p) => ({ ...p, subtipo: v === '__none__' ? '' : (v as Tributo['subtipo']) }))}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {SUBTIPOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Alíquota (%) *</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={form.aliquota}
                required
                onChange={(e) => setForm((p) => ({ ...p, aliquota: e.target.value }))}
              />
            </div>
            <div>
              <Label>Base de cálculo (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.baseCalculo}
                onChange={(e) => setForm((p) => ({ ...p, baseCalculo: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>UF</Label>
              <Input
                value={form.uf}
                maxLength={2}
                onChange={(e) => setForm((p) => ({ ...p, uf: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <Label>Regime tributário</Label>
              <Input
                value={form.regimeTributario}
                onChange={(e) => setForm((p) => ({ ...p, regimeTributario: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NCM início</Label>
              <Input value={form.ncmInicio} onChange={(e) => setForm((p) => ({ ...p, ncmInicio: e.target.value }))} />
            </div>
            <div>
              <Label>NCM fim</Label>
              <Input value={form.ncmFim} onChange={(e) => setForm((p) => ({ ...p, ncmFim: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data início *</Label>
              <Input
                type="date"
                value={form.dataInicio}
                required
                onChange={(e) => setForm((p) => ({ ...p, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data fim</Label>
              <Input
                type="date"
                value={form.dataFim}
                onChange={(e) => setForm((p) => ({ ...p, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              rows={2}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
            <Label>Ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
