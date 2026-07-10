import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services/colaboradorService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Gift, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const supabase: any = _supabase;

interface Beneficio {
  id: string;
  colaborador_id: string;
  nome: string;
  tipo: string | null;
  valor: number | null;
  percentual: number | null;
  desconta_folha: boolean | null;
  empresa_paga: boolean | null;
  inicio_vigencia: string | null;
  fim_vigencia: string | null;
  ativo: boolean | null;
  observacoes: string | null;
}

const empty = {
  id: '',
  colaborador_id: '',
  nome: '',
  tipo: '',
  valor: '',
  percentual: '',
  desconta_folha: false,
  empresa_paga: true,
  inicio_vigencia: '',
  fim_vigencia: '',
  ativo: true,
  observacoes: '',
};

const BeneficiosVinculados: React.FC = () => {
  const qc = useQueryClient();
  const [filtroColaborador, setFiltroColaborador] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficio | null>(null);
  const [toDelete, setToDelete] = useState<Beneficio | null>(null);
  const [form, setForm] = useState({ ...empty });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: colaboradorService.fetchColaboradores,
  });

  const { data: beneficios = [], isLoading, error } = useQuery<Beneficio[]>({
    queryKey: ['beneficios_vinculados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficios_vinculados')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const colaboradorMap = useMemo(() => {
    const m: Record<string, string> = {};
    (colaboradores as any[]).forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [colaboradores]);

  const filtered = filtroColaborador === 'all' ? beneficios : beneficios.filter((b) => b.colaborador_id === filtroColaborador);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setModalOpen(true);
  };

  const openEdit = (b: Beneficio) => {
    setEditing(b);
    setForm({
      id: b.id,
      colaborador_id: b.colaborador_id,
      nome: b.nome,
      tipo: b.tipo || '',
      valor: b.valor != null ? String(b.valor) : '',
      percentual: b.percentual != null ? String(b.percentual) : '',
      desconta_folha: !!b.desconta_folha,
      empresa_paga: b.empresa_paga !== false,
      inicio_vigencia: b.inicio_vigencia || '',
      fim_vigencia: b.fim_vigencia || '',
      ativo: b.ativo !== false,
      observacoes: b.observacoes || '',
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: empresaId } = await supabase.rpc('get_user_empresa_id');
      if (!empresaId && !editing) throw new Error('Empresa não encontrada');
      const payload: any = {
        colaborador_id: form.colaborador_id,
        nome: form.nome,
        tipo: form.tipo || null,
        valor: form.valor ? Number(form.valor) : null,
        percentual: form.percentual ? Number(form.percentual) : null,
        desconta_folha: form.desconta_folha,
        empresa_paga: form.empresa_paga,
        inicio_vigencia: form.inicio_vigencia || null,
        fim_vigencia: form.fim_vigencia || null,
        ativo: form.ativo,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        const { error } = await supabase.from('beneficios_vinculados').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        payload.empresa_representada_id = empresaId;
        const { error } = await supabase.from('beneficios_vinculados').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficios_vinculados'] });
      toast.success(editing ? 'Benefício atualizado' : 'Benefício criado');
      setModalOpen(false);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('beneficios_vinculados').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficios_vinculados'] });
      toast.success('Benefício excluído');
      setToDelete(null);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Benefícios Vinculados</h1>
          <p className="text-muted-foreground">Gerencie os benefícios por colaborador</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Benefício</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label>Colaborador</Label>
          <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
            <SelectTrigger className="max-w-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(colaboradores as any[]).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Erro ao carregar benefícios</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum benefício encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Benefício</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{colaboradorMap[b.colaborador_id] || '—'}</TableCell>
                    <TableCell>{b.nome}</TableCell>
                    <TableCell>{b.tipo || '—'}</TableCell>
                    <TableCell>{b.valor != null ? `R$ ${b.valor.toFixed(2)}` : b.percentual != null ? `${b.percentual}%` : '—'}</TableCell>
                    <TableCell><Badge variant={b.ativo ? 'default' : 'secondary'}>{b.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(b)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Benefício' : 'Novo Benefício'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Colaborador *</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(colaboradores as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Tipo</Label><Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="VR, VT, Plano Saúde..." /></div>
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
            <div><Label>Percentual (%)</Label><Input type="number" step="0.01" value={form.percentual} onChange={(e) => setForm({ ...form, percentual: e.target.value })} /></div>
            <div><Label>Início Vigência</Label><Input type="date" value={form.inicio_vigencia} onChange={(e) => setForm({ ...form, inicio_vigencia: e.target.value })} /></div>
            <div><Label>Fim Vigência</Label><Input type="date" value={form.fim_vigencia} onChange={(e) => setForm({ ...form, fim_vigencia: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.desconta_folha} onCheckedChange={(c) => setForm({ ...form, desconta_folha: !!c })} /><Label>Desconta em folha</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.empresa_paga} onCheckedChange={(c) => setForm({ ...form, empresa_paga: !!c })} /><Label>Empresa paga</Label></div>
            <div className="flex items-center gap-2"><Checkbox checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: !!c })} /><Label>Ativo</Label></div>
            <div className="col-span-2"><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.colaborador_id || !form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir benefício"
        description={`Confirmar exclusão do benefício "${toDelete?.nome}"?`}
        confirmLabel="Excluir"
        onConfirm={() => toDelete && deleteMutation.mutate(toDelete.id)}
      />
    </div>
  );
};

export default BeneficiosVinculados;
