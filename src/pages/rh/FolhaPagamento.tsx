import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colaboradorService } from '@/services/colaboradorService';
import { folhaPagamentoService } from '@/services/folhaPagamentoService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const FolhaPagamento: React.FC = () => {
  const qc = useQueryClient();
  const [filtroColaborador, setFiltroColaborador] = useState<string>('all');
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    colaborador_id: '',
    competencia: '',
    salario_base: '',
    total_vencimentos: '',
    total_descontos: '',
    inss: '',
    irrf: '',
    fgts: '',
    status: 'PENDENTE',
    observacoes: '',
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: colaboradorService.fetchColaboradores,
  });

  const { data: folhas = [], isLoading, error } = useQuery({
    queryKey: ['folha_pagamento'],
    queryFn: folhaPagamentoService.listFolhas,
  });

  const colaboradorMap = useMemo(() => {
    const m: Record<string, string> = {};
    colaboradores.forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [colaboradores]);

  const filtered = folhas.filter((f) => {
    if (filtroColaborador !== 'all' && f.colaborador_id !== filtroColaborador) return false;
    if (filtroCompetencia && !f.competencia.startsWith(filtroCompetencia)) return false;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: () => folhaPagamentoService.criarFolha({
      colaborador_id: form.colaborador_id,
      competencia: form.competencia + '-01',
      salario_base: Number(form.salario_base) || 0,
      total_vencimentos: form.total_vencimentos ? Number(form.total_vencimentos) : null,
      total_descontos: form.total_descontos ? Number(form.total_descontos) : null,
      inss: form.inss ? Number(form.inss) : null,
      irrf: form.irrf ? Number(form.irrf) : null,
      fgts: form.fgts ? Number(form.fgts) : null,
      status: form.status,
      observacoes: form.observacoes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['folha_pagamento'] });
      toast.success('Registro de folha criado');
      setModalOpen(false);
      setForm({ colaborador_id: '', competencia: '', salario_base: '', total_vencimentos: '', total_descontos: '', inss: '', irrf: '', fgts: '', status: 'PENDENTE', observacoes: '' });
    },
    onError: (e: Error) => toast.error('Erro ao criar folha: ' + e.message),
  });

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Folha de Pagamento</h1>
          <p className="text-muted-foreground">Gerencie os registros de folha por competência</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Nova Folha</Button>
      </div>

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5" />Cálculo automático ainda não existe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Os valores abaixo (INSS, IRRF, FGTS, vencimentos e descontos) são digitados manualmente — o sistema não calcula nada, só registra o que você informar. Decisão de produto (2026-08-19): o cálculo automático será um motor interno, ainda não implementado.</p>
          <p className="text-muted-foreground">Os catálogos de Vencimentos Padrão, Descontos Padrão e Benefícios Vinculados também não alimentam esta tela até o motor existir.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Colaborador</Label>
            <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Competência (YYYY-MM)</Label>
            <Input type="month" value={filtroCompetencia} onChange={(e) => setFiltroCompetencia(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Erro ao carregar folhas</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum registro de folha encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Salário Base</TableHead>
                  <TableHead>Vencimentos</TableHead>
                  <TableHead>Descontos</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{colaboradorMap[f.colaborador_id] || '—'}</TableCell>
                    <TableCell>{f.competencia?.slice(0, 7)}</TableCell>
                    <TableCell>{formatCurrency(f.salario_base)}</TableCell>
                    <TableCell>{formatCurrency(f.total_vencimentos)}</TableCell>
                    <TableCell>{formatCurrency(f.total_descontos)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(f.salario_liquido)}</TableCell>
                    <TableCell><Badge variant="outline">{f.status || 'PENDENTE'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova Folha de Pagamento</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Colaborador *</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Competência *</Label><Input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="PROCESSADA">Processada</SelectItem>
                  <SelectItem value="PAGA">Paga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Salário Base *</Label><Input type="number" step="0.01" value={form.salario_base} onChange={(e) => setForm({ ...form, salario_base: e.target.value })} /></div>
            <div><Label>Total Vencimentos</Label><Input type="number" step="0.01" value={form.total_vencimentos} onChange={(e) => setForm({ ...form, total_vencimentos: e.target.value })} /></div>
            <div><Label>Total Descontos</Label><Input type="number" step="0.01" value={form.total_descontos} onChange={(e) => setForm({ ...form, total_descontos: e.target.value })} /></div>
            <div><Label>INSS</Label><Input type="number" step="0.01" value={form.inss} onChange={(e) => setForm({ ...form, inss: e.target.value })} /></div>
            <div><Label>IRRF</Label><Input type="number" step="0.01" value={form.irrf} onChange={(e) => setForm({ ...form, irrf: e.target.value })} /></div>
            <div><Label>FGTS</Label><Input type="number" step="0.01" value={form.fgts} onChange={(e) => setForm({ ...form, fgts: e.target.value })} /></div>
            <div className="col-span-2"><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!form.colaborador_id || !form.competencia || !form.salario_base || createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FolhaPagamento;
