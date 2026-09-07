import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Plus, Loader2, Trash2, Users } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAlcadas } from '@/hooks/useAlcadas';
import { usuarioService } from '@/services/usuarioService';
import { useQuery } from '@tanstack/react-query';
import { PERMISSOES_GRANULARES } from '@/components/modules/configuracoes/usuarios/PermissionsSelector';
import type { AlcadaAprovacao, AlcadaAprovacaoInput, AlcadaSubstitutoInput } from '@/types/alcadas';
import { currencyUtils } from '@/utils/currencyUtils';

const TODAS_PERMISSOES = PERMISSOES_GRANULARES.flatMap((m) =>
  m.permissoes.map((p) => ({ codigo: p.codigo, nome: `${m.modulo} — ${p.nome}` }))
);

const emptyForm = (): AlcadaAprovacaoInput => ({
  categoria: '',
  valor_minimo: 0,
  permissao_necessaria: '',
  descricao: '',
  ativo: true,
});

const emptySubstitutoForm = (): AlcadaSubstitutoInput => ({
  aprovador_titular_id: '',
  aprovador_substituto_id: '',
  categoria: '',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: new Date().toISOString().slice(0, 10),
  motivo: '',
});

const AlcadasAprovacao: React.FC = () => {
  const {
    alcadas, isLoading, criar, isCreating, atualizar, isUpdating, remover,
    substitutos, isLoadingSubstitutos, criarSubstituto, isCreatingSubstituto, removerSubstituto,
  } = useAlcadas();
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios-ativos'], queryFn: usuarioService.fetchUsuariosAtivos });

  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<AlcadaAprovacao | null>(null);
  const [form, setForm] = useState<AlcadaAprovacaoInput>(emptyForm());
  const [removendo, setRemovendo] = useState<AlcadaAprovacao | null>(null);

  const [openSubst, setOpenSubst] = useState(false);
  const [formSubst, setFormSubst] = useState<AlcadaSubstitutoInput>(emptySubstitutoForm());
  const [removendoSubstId, setRemovendoSubstId] = useState<string | null>(null);

  const nomesPorUserId = new Map(usuarios.map((u) => [u.user_id, u.nome]));

  const setField = <K extends keyof AlcadaAprovacaoInput>(k: K, v: AlcadaAprovacaoInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));
  const setFieldSubst = <K extends keyof AlcadaSubstitutoInput>(k: K, v: AlcadaSubstitutoInput[K]) =>
    setFormSubst((p) => ({ ...p, [k]: v }));

  const openNew = () => { setEditando(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (a: AlcadaAprovacao) => {
    setEditando(a);
    setForm({ categoria: a.categoria, valor_minimo: a.valor_minimo, permissao_necessaria: a.permissao_necessaria, descricao: a.descricao, ativo: a.ativo });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editando) await atualizar({ id: editando.id, input: form });
    else await criar(form);
    setOpen(false);
  };

  const submitSubst = async (e: React.FormEvent) => {
    e.preventDefault();
    await criarSubstituto(formSubst);
    setOpenSubst(false);
    setFormSubst(emptySubstitutoForm());
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Alçadas de Aprovação</h1>
          <p className="text-muted-foreground">
            Faixas de valor por categoria que exigem aprovação antes de seguir — motor consumido pela Central de Aprovações.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Alçada</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Faixas configuradas</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground text-center py-8">Carregando…</p>}
          {!isLoading && alcadas.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma alçada configurada — enquanto isso, nenhuma solicitação nessas categorias exige aprovação.
            </p>
          )}
          {!isLoading && alcadas.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>A partir de</TableHead>
                  <TableHead>Permissão exigida</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alcadas.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => openEdit(a)}>
                    <TableCell className="font-medium">{a.categoria}</TableCell>
                    <TableCell>{currencyUtils.formatCurrency(a.valor_minimo)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{TODAS_PERMISSOES.find((p) => p.codigo === a.permissao_necessaria)?.nome || a.permissao_necessaria}</span>
                    </TableCell>
                    <TableCell><Badge variant={a.ativo ? 'default' : 'secondary'}>{a.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setRemovendo(a); }}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />Substituições Temporárias</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOpenSubst(true)}><Plus className="w-4 h-4 mr-2" />Nova Substituição</Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            O substituto só herda a autoridade de aprovar enquanto o titular também detiver a permissão da alçada — a substituição não é uma promoção.
          </p>
          {isLoadingSubstitutos && <p className="text-muted-foreground text-center py-6">Carregando…</p>}
          {!isLoadingSubstitutos && substitutos.length === 0 && (
            <p className="text-muted-foreground text-center py-6">Nenhuma substituição registrada.</p>
          )}
          {!isLoadingSubstitutos && substitutos.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Substituto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {substitutos.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{nomesPorUserId.get(s.aprovador_titular_id) || s.aprovador_titular_id}</TableCell>
                    <TableCell>{nomesPorUserId.get(s.aprovador_substituto_id) || s.aprovador_substituto_id}</TableCell>
                    <TableCell>{s.categoria || <span className="text-muted-foreground">Todas</span>}</TableCell>
                    <TableCell className="text-sm">{s.data_inicio} — {s.data_fim}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{s.motivo}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setRemovendoSubstId(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? 'Editar Alçada' : 'Nova Alçada'}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Categoria *</Label>
              <Input value={form.categoria} onChange={(e) => setField('categoria', e.target.value)} placeholder="Ex: COMPRA, PAGAMENTO_EXTRA" required />
              <p className="text-xs text-muted-foreground mt-1">Livre — quem abre a solicitação (ex.: Compras) decide o identificador da categoria.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor a partir de *</Label>
                <Input type="number" step="0.01" min={0} value={form.valor_minimo} onChange={(e) => setField('valor_minimo', Number(e.target.value))} required />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={form.ativo ?? true} onCheckedChange={(v) => setField('ativo', v)} id="ativo" />
                <Label htmlFor="ativo">Alçada ativa</Label>
              </div>
            </div>
            <div>
              <Label>Permissão exigida para aprovar *</Label>
              <Select value={form.permissao_necessaria || undefined} onValueChange={(v) => setField('permissao_necessaria', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a permissão" /></SelectTrigger>
                <SelectContent>
                  {TODAS_PERMISSOES.map((p) => <SelectItem key={p.codigo} value={p.codigo}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao || ''} onChange={(e) => setField('descricao', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCreating || isUpdating}>Cancelar</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openSubst} onOpenChange={setOpenSubst}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Substituição Temporária</DialogTitle></DialogHeader>
          <form onSubmit={submitSubst} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Titular *</Label>
                <Select value={formSubst.aprovador_titular_id || undefined} onValueChange={(v) => setFieldSubst('aprovador_titular_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{usuarios.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Substituto *</Label>
                <Select value={formSubst.aprovador_substituto_id || undefined} onValueChange={(v) => setFieldSubst('aprovador_substituto_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{usuarios.map((u) => <SelectItem key={u.user_id} value={u.user_id}>{u.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={formSubst.categoria || ''} onChange={(e) => setFieldSubst('categoria', e.target.value)} placeholder="Deixe vazio para todas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>De *</Label>
                <Input type="date" value={formSubst.data_inicio} onChange={(e) => setFieldSubst('data_inicio', e.target.value)} required />
              </div>
              <div>
                <Label>Até *</Label>
                <Input type="date" value={formSubst.data_fim} onChange={(e) => setFieldSubst('data_fim', e.target.value)} required />
              </div>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={formSubst.motivo} onChange={(e) => setFieldSubst('motivo', e.target.value)} placeholder="Ex: Férias, viagem, licença" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenSubst(false)} disabled={isCreatingSubstituto}>Cancelar</Button>
              <Button type="submit" disabled={isCreatingSubstituto}>
                {isCreatingSubstituto && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removendo}
        onOpenChange={(o) => !o && setRemovendo(null)}
        title="Remover alçada?"
        description={`A categoria "${removendo?.categoria}" a partir de ${removendo ? currencyUtils.formatCurrency(removendo.valor_minimo) : ''} deixará de exigir aprovação.`}
        onConfirm={async () => { if (removendo) { await remover(removendo.id); setRemovendo(null); } }}
      />

      <ConfirmDialog
        open={!!removendoSubstId}
        onOpenChange={(o) => !o && setRemovendoSubstId(null)}
        title="Remover substituição?"
        description="O substituto deixará de poder decidir em nome do titular imediatamente."
        onConfirm={async () => { if (removendoSubstId) { await removerSubstituto(removendoSubstId); setRemovendoSubstId(null); } }}
      />
    </div>
  );
};

export default AlcadasAprovacao;
