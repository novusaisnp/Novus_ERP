import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { NCM } from '@/types/fiscal';
import { useCreateNCM, useUpdateNCM } from '@/hooks/useFiscal';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ncm?: NCM | null;
  mode: 'view' | 'edit' | 'create';
}

const empty = {
  codigo: '',
  descricao: '',
  unidade: '',
  aliquotaIpi: 0,
  categoria: '',
  observacoes: '',
  ativo: true,
};

export const NCMFormModal: React.FC<Props> = ({ open, onOpenChange, ncm, mode }) => {
  const [form, setForm] = useState(empty);
  const createMut = useCreateNCM();
  const updateMut = useUpdateNCM();
  const readOnly = mode === 'view';
  const saving = createMut.isPending || updateMut.isPending;

  useEffect(() => {
    if (open) {
      if (ncm) {
        setForm({
          codigo: ncm.codigo,
          descricao: ncm.descricao,
          unidade: ncm.unidade ?? '',
          aliquotaIpi: ncm.aliquotaIpi ?? 0,
          categoria: ncm.categoria ?? '',
          observacoes: ncm.observacoes ?? '',
          ativo: ncm.ativo,
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, ncm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (!/^[0-9]{8}$/.test(form.codigo)) {
      toast.error('Código NCM deve ter 8 dígitos numéricos.');
      return;
    }
    if (!form.descricao.trim()) {
      toast.error('Descrição é obrigatória.');
      return;
    }
    const payload = {
      codigo: form.codigo,
      descricao: form.descricao,
      unidade: form.unidade || undefined,
      aliquotaIpi: Number(form.aliquotaIpi) || 0,
      categoria: form.categoria || undefined,
      observacoes: form.observacoes || undefined,
      ativo: form.ativo,
    };
    try {
      if (mode === 'edit' && ncm?.id) {
        await updateMut.mutateAsync({ id: ncm.id, input: payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      /* toast handled by hook */
    }
  };

  const title = mode === 'view' ? 'Visualizar NCM' : mode === 'edit' ? 'Editar NCM' : 'Novo NCM';

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
                maxLength={8}
                disabled={readOnly}
                placeholder="8 dígitos"
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Unidade</Label>
              <Input
                value={form.unidade}
                disabled={readOnly}
                onChange={(e) => setForm((p) => ({ ...p, unidade: e.target.value }))}
              />
            </div>
            <div>
              <Label>Alíq. IPI (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.aliquotaIpi}
                disabled={readOnly}
                onChange={(e) => setForm((p) => ({ ...p, aliquotaIpi: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input
                value={form.categoria}
                disabled={readOnly}
                onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              disabled={readOnly}
              rows={3}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
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
