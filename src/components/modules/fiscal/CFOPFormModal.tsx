import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CFOP } from '@/types/fiscal';
import { useCreateCFOP, useUpdateCFOP } from '@/hooks/useFiscal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cfop?: CFOP | null;
  mode: 'view' | 'edit' | 'create';
}

const empty = {
  codigo: '',
  descricao: '',
  aplicacao: '',
  destino: 'interno' as CFOP['destino'],
  tipo: 'saida' as CFOP['tipo'],
  categoria: '',
  ativo: true,
};

export const CFOPFormModal: React.FC<Props> = ({ open, onOpenChange, cfop, mode }) => {
  const [form, setForm] = useState(empty);
  const createMut = useCreateCFOP();
  const updateMut = useUpdateCFOP();
  const readOnly = mode === 'view';
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      if (cfop) {
        setForm({
          codigo: cfop.codigo,
          descricao: cfop.descricao,
          aplicacao: cfop.aplicacao ?? '',
          destino: cfop.destino,
          tipo: cfop.tipo,
          categoria: cfop.categoria ?? '',
          ativo: cfop.ativo,
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, cfop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!/^[0-9]{4}$/.test(form.codigo)) {
      // eslint-disable-next-line no-alert
      alert('Código CFOP deve ter 4 dígitos numéricos.');
      return;
    }
    const payload = {
      codigo: form.codigo,
      descricao: form.descricao,
      aplicacao: form.aplicacao || undefined,
      destino: form.destino,
      tipo: form.tipo,
      categoria: form.categoria || undefined,
      ativo: form.ativo,
    };
    try {
      if (mode === 'edit' && cfop?.id) {
        await updateMut.mutateAsync({ id: cfop.id, input: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      /* toast handled by hook */
    }
  };

  const title = mode === 'view' ? 'Visualizar CFOP' : mode === 'edit' ? 'Editar CFOP' : 'Novo CFOP';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Código *</Label>
              <Input
                value={form.codigo}
                maxLength={4}
                disabled={readOnly}
                onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.replace(/\D/g, '') }))}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch
                checked={form.ativo}
                disabled={readOnly}
                onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input
              value={form.descricao}
              disabled={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.tipo}
                disabled={readOnly}
                onValueChange={(v) => setForm((p) => ({ ...p, tipo: v as CFOP['tipo'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destino</Label>
              <Select
                value={form.destino}
                disabled={readOnly}
                onValueChange={(v) => setForm((p) => ({ ...p, destino: v as CFOP['destino'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="interestadual">Interestadual</SelectItem>
                  <SelectItem value="exterior">Exterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              value={form.categoria}
              disabled={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            />
          </div>
          <div>
            <Label>Aplicação</Label>
            <Input
              value={form.aplicacao}
              disabled={readOnly}
              onChange={(e) => setForm((p) => ({ ...p, aplicacao: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? 'Fechar' : 'Cancelar'}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
