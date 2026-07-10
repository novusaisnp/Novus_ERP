import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Loader2 } from 'lucide-react';
import { useSociosRepresentantes } from '@/hooks/useSociosRepresentantes';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { SocioRepresentante, TipoSocio } from '@/types/socios';
import { TIPO_SOCIO_LABEL } from '@/types/socios';

interface Props {
  empresaId?: string;
}

const empty = (empresaId: string): SocioRepresentante => ({
  empresa_representada_id: empresaId,
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  tipo: 'SOCIO',
  participacao_percentual: null,
  cargo_societario: '',
  ativo: true,
});

const SociosRepresentantesTab: React.FC<Props> = ({ empresaId }) => {
  const { socios, loading, save, remove, saving } = useSociosRepresentantes(empresaId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SocioRepresentante | null>(null);
  const [toDelete, setToDelete] = useState<SocioRepresentante | null>(null);

  if (!empresaId) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Salve a empresa antes de cadastrar sócios ou representantes.
      </div>
    );
  }

  const openNew = () => { setForm(empty(empresaId)); setOpen(true); };
  const openEdit = (s: SocioRepresentante) => { setForm({ ...s }); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    await save(form);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Sócios e Representantes Legais</h3>
          <p className="text-xs text-muted-foreground">
            Apenas pessoas cadastradas aqui ou em RH/Colaboradores podem virar usuários do sistema.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />Novo
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
      ) : socios.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum sócio ou representante cadastrado</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {socios.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.nome}</div>
                    <div className="text-xs text-muted-foreground">{s.cpf || 'CPF não informado'}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{TIPO_SOCIO_LABEL[s.tipo]}</Badge>
                </div>
                {s.cargo_societario && <div className="text-xs">{s.cargo_societario}</div>}
                {s.participacao_percentual != null && (
                  <div className="text-xs text-muted-foreground">Participação: {s.participacao_percentual}%</div>
                )}
                <div className="flex justify-end gap-1 pt-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={() => setToDelete(s)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Editar' : 'Novo'} sócio/representante</DialogTitle>
          </DialogHeader>
          {form && (
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={form.cpf || ''} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoSocio })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOCIO">Sócio</SelectItem>
                      <SelectItem value="REPRESENTANTE_LEGAL">Representante Legal</SelectItem>
                      <SelectItem value="PROCURADOR">Procurador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
                </div>
                <div>
                  <Label>Cargo Societário</Label>
                  <Input value={form.cargo_societario || ''} onChange={(e) => setForm({ ...form, cargo_societario: e.target.value })} />
                </div>
                <div>
                  <Label>Participação (%)</Label>
                  <Input
                    type="number" step="0.01" min="0" max="100"
                    value={form.participacao_percentual ?? ''}
                    onChange={(e) => setForm({ ...form, participacao_percentual: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover sócio/representante?"
        description={`"${toDelete?.nome || ''}" será removido.`}
        onConfirm={async () => { if (toDelete?.id) await remove(toDelete.id); setToDelete(null); }}
      />
    </div>
  );
};

export default SociosRepresentantesTab;
