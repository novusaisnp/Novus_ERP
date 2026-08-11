import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { camposPersonalizadosService } from '@/services/camposPersonalizadosService';
import type { CampoPersonalizado, CampoPersonalizadoInput, TipoCampoPersonalizado } from '@/types/campoPersonalizado';

const TIPOS: { value: TipoCampoPersonalizado; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'data', label: 'Data' },
  { value: 'booleano', label: 'Sim/Não' },
  { value: 'selecao', label: 'Lista de opções' },
];

const chaveTecnica = (rotulo: string) => rotulo
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .replace(/^[^a-z]+/, '');

const EMPTY = {
  rotulo: '', chave: '', tipo: 'texto' as TipoCampoPersonalizado,
  opcoesTexto: '', obrigatorio: false, ordem: 0, ativo: true,
};

export default function CamposPersonalizados() {
  const { data: empresaId } = useEmpresaAtual();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CampoPersonalizado | null>(null);
  const [form, setForm] = useState(EMPTY);

  const queryKey = ['campos-personalizados', empresaId];
  const { data: campos = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => camposPersonalizadosService.listar(empresaId!),
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      rotulo: editing.rotulo,
      chave: editing.chave,
      tipo: editing.tipo,
      opcoesTexto: editing.opcoes?.join('\n') ?? '',
      obrigatorio: editing.obrigatorio,
      ordem: editing.ordem,
      ativo: editing.ativo,
    } : EMPTY);
  }, [editing, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa atual não encontrada.');
      const opcoes = form.tipo === 'selecao'
        ? form.opcoesTexto.split('\n').map((item) => item.trim()).filter(Boolean)
        : null;
      if (!form.rotulo.trim() || !form.chave || (form.tipo === 'selecao' && opcoes?.length === 0)) {
        throw new Error('Preencha o rótulo e ao menos uma opção quando usar lista.');
      }
      if (editing) {
        return camposPersonalizadosService.atualizar(editing.id, empresaId, {
          rotulo: form.rotulo.trim(), tipo: form.tipo, opcoes,
          obrigatorio: form.obrigatorio, ordem: form.ordem, ativo: form.ativo,
        });
      }
      const input: CampoPersonalizadoInput = {
        empresa_representada_id: empresaId,
        chave: form.chave,
        rotulo: form.rotulo.trim(),
        tipo: form.tipo,
        opcoes,
        obrigatorio: form.obrigatorio,
        ordem: form.ordem,
        ativo: form.ativo,
      };
      return camposPersonalizadosService.criar(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['campos-personalizados-ativos', empresaId] });
      setOpen(false);
      toast.success(editing ? 'Campo atualizado.' : 'Campo criado.');
    },
    onError: (error: Error) => toast.error(error.message.includes('duplicate') ? 'Já existe um campo com essa chave.' : error.message),
  });

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (campo: CampoPersonalizado) => { setEditing(campo); setOpen(true); };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-primary">
            <SlidersHorizontal className="h-7 w-7" /> Campos personalizados
          </h1>
          <p className="max-w-prose text-muted-foreground">Adicione informações próprias da empresa ao cadastro unificado de entidades.</p>
        </div>
        <Button onClick={openNew} disabled={!empresaId}><Plus className="mr-2 h-4 w-4" /> Novo campo</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Campo</TableHead><TableHead>Tipo</TableHead><TableHead>Obrigatório</TableHead><TableHead>Status</TableHead><TableHead className="w-16" />
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && campos.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum campo personalizado. Crie o primeiro quando precisar complementar o cadastro.</TableCell></TableRow>}
              {campos.map((campo) => <TableRow key={campo.id}>
                <TableCell><div className="font-medium">{campo.rotulo}</div><div className="font-mono text-xs text-muted-foreground">{campo.chave}</div></TableCell>
                <TableCell>{TIPOS.find((tipo) => tipo.value === campo.tipo)?.label}</TableCell>
                <TableCell>{campo.obrigatorio ? 'Sim' : 'Não'}</TableCell>
                <TableCell><Badge variant={campo.ativo ? 'default' : 'outline'}>{campo.ativo ? 'ATIVO' : 'INATIVO'}</Badge></TableCell>
                <TableCell><Button variant="ghost" size="icon" aria-label={`Editar ${campo.rotulo}`} onClick={() => openEdit(campo)}><Pencil className="h-4 w-4" /></Button></TableCell>
              </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar campo' : 'Novo campo personalizado'}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
            <div className="space-y-2"><Label htmlFor="rotulo">Rótulo *</Label><Input id="rotulo" value={form.rotulo} onChange={(event) => setForm((prev) => ({ ...prev, rotulo: event.target.value, chave: editing ? prev.chave : chaveTecnica(event.target.value) }))} required /></div>
            <div className="space-y-2"><Label htmlFor="chave">Chave técnica</Label><Input id="chave" value={form.chave} readOnly className="font-mono bg-muted" /><p className="text-xs text-muted-foreground">Definida na criação e preservada para não perder dados históricos.</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo *</Label><Select value={form.tipo} disabled={!!editing} onValueChange={(tipo) => setForm((prev) => ({ ...prev, tipo: tipo as TipoCampoPersonalizado }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TIPOS.map((tipo) => <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="ordem">Ordem</Label><Input id="ordem" type="number" value={form.ordem} onChange={(event) => setForm((prev) => ({ ...prev, ordem: Number(event.target.value) }))} /></div>
            </div>
            {form.tipo === 'selecao' && <div className="space-y-2"><Label htmlFor="opcoes">Opções *</Label><Textarea id="opcoes" rows={5} value={form.opcoesTexto} onChange={(event) => setForm((prev) => ({ ...prev, opcoesTexto: event.target.value }))} placeholder={'Uma opção por linha\nVarejo\nAtacado'} required /><p className="text-xs text-muted-foreground">Uma opção por linha.</p></div>}
            <div className="flex items-center justify-between rounded-md border p-3"><Label htmlFor="obrigatorio">Preenchimento obrigatório</Label><Checkbox id="obrigatorio" checked={form.obrigatorio} onCheckedChange={(value) => setForm((prev) => ({ ...prev, obrigatorio: value === true }))} /></div>
            <div className="flex items-center justify-between rounded-md border p-3"><div><Label htmlFor="ativo">Campo ativo</Label><p className="text-xs text-muted-foreground">Campos inativos deixam de aparecer sem apagar valores já gravados.</p></div><Switch id="ativo" checked={form.ativo} onCheckedChange={(ativo) => setForm((prev) => ({ ...prev, ativo }))} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Salvando...' : 'Salvar campo'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
