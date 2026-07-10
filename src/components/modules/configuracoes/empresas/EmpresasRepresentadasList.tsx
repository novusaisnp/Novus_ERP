import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmpresaRepresentada } from '@/hooks/useEmpresasRepresentadas';
import { toast } from 'sonner';

interface Props {
  empresas: EmpresaRepresentada[];
  onSave: (e: EmpresaRepresentada) => Promise<any> | any;
  onDelete: (id: string) => Promise<any> | any;
}

const empty = (): EmpresaRepresentada => ({
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  ativo: true,
});

const EmpresasRepresentadasList: React.FC<Props> = ({ empresas, onSave, onDelete }) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmpresaRepresentada | null>(null);
  const [form, setForm] = useState<EmpresaRepresentada>(empty());
  const [toDelete, setToDelete] = useState<EmpresaRepresentada | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? { ...empty(), ...editing } : empty());
  }, [open, editing]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (e: EmpresaRepresentada) => { setEditing(e); setOpen(true); };

  const setField = <K extends keyof EmpresaRepresentada>(k: K, v: EmpresaRepresentada[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(form);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Empresas Representadas</h2>
          <p className="text-muted-foreground">Gerencie as empresas cadastradas</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Empresa</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {empresas.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{e.nome}</div>
                  {e.cnpj && <div className="text-xs text-muted-foreground">{e.cnpj}</div>}
                </div>
                <Badge variant={e.ativo ? 'default' : 'secondary'}>{e.ativo ? 'Ativa' : 'Inativa'}</Badge>
              </div>
              {(e.cidade || e.estado) && (
                <div className="text-sm text-muted-foreground">{[e.cidade, e.estado].filter(Boolean).join('/')}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(e)}>
                  <Edit className="w-3 h-3 mr-1" />Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setToDelete(e)}>
                  <Trash2 className="w-3 h-3 mr-1" />Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {empresas.length === 0 && (
          <Card className="col-span-full p-8 text-center">
            <Building className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(ev) => setField('nome', ev.target.value)} required />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input value={form.cnpj || ''} onChange={(ev) => setField('cnpj', ev.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email || ''} onChange={(ev) => setField('email', ev.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone || ''} onChange={(ev) => setField('telefone', ev.target.value)} />
              </div>
              <div>
                <Label>CEP</Label>
                <Input value={form.cep || ''} onChange={(ev) => setField('cep', ev.target.value)} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.cidade || ''} onChange={(ev) => setField('cidade', ev.target.value)} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.estado || ''} onChange={(ev) => setField('estado', ev.target.value)} maxLength={2} />
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Textarea value={form.endereco || ''} onChange={(ev) => setField('endereco', ev.target.value)} />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <Switch checked={!!form.ativo} onCheckedChange={(v) => setField('ativo', v)} id="ativa" />
                <Label htmlFor="ativa">Empresa ativa</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir empresa?"
        description={`A empresa "${toDelete?.nome || ''}" será removida.`}
        onConfirm={async () => { if (toDelete?.id) await onDelete(toDelete.id); setToDelete(null); }}
      />
    </div>
  );
};

export default EmpresasRepresentadasList;
