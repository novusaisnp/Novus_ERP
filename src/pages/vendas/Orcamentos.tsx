import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useOrcamentos,
  useCreateOrcamento,
  useUpdateOrcamentoStatus,
} from '@/hooks/useOrcamentos';
import type { Orcamento, OrcamentoStatus } from '@/services/orcamentosService';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { toast } from 'sonner';

const STATUS_OPTIONS: OrcamentoStatus[] = [
  'rascunho',
  'enviado',
  'aprovado',
  'recusado',
  'expirado',
  'cancelado',
  'convertido',
];

const STATUS_LABEL: Record<OrcamentoStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
  convertido: 'Convertido',
};

const statusVariant = (s: OrcamentoStatus) => {
  switch (s) {
    case 'aprovado':
    case 'convertido':
      return 'default';
    case 'enviado':
      return 'secondary';
    case 'recusado':
    case 'cancelado':
    case 'expirado':
      return 'destructive';
    default:
      return 'outline';
  }
};

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const gerarNumero = () => {
  const d = new Date();
  const rnd = Math.floor(Math.random() * 900 + 100);
  return `ORC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${rnd}`;
};

const emptyForm = () => ({
  empresaRepresentadaId: '',
  numero: gerarNumero(),
  clienteId: '',
  dataEmissao: new Date().toISOString().slice(0, 10),
  dataValidade: '',
  valorTotal: 0,
  observacoes: '',
});

const Orcamentos: React.FC = () => {
  const { data: orcamentos, isLoading } = useOrcamentos();
  const { clientes } = useClientes();
  const { data: empresas } = useEmpresasRepresentadas();
  const createMut = useCreateOrcamento();
  const statusMut = useUpdateOrcamentoStatus();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrcamentoStatus>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const filtered = useMemo(() => {
    return (orcamentos ?? []).filter((o) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        o.numero.toLowerCase().includes(term) ||
        (o.clienteNome ?? '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orcamentos, search, statusFilter]);

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      empresaRepresentadaId: empresas?.[0]?.id ?? '',
    });
    setOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresaRepresentadaId) {
      toast.error('Selecione a empresa representada.');
      return;
    }
    if (!form.numero.trim()) {
      toast.error('Número do orçamento é obrigatório.');
      return;
    }
    try {
      await createMut.mutateAsync({
        empresaRepresentadaId: form.empresaRepresentadaId,
        numero: form.numero.trim(),
        clienteId: form.clienteId || null,
        dataEmissao: form.dataEmissao,
        dataValidade: form.dataValidade || null,
        valorTotal: Number(form.valorTotal) || 0,
        observacoes: form.observacoes || null,
        status: 'rascunho',
      });
      setOpen(false);
    } catch {
      /* toast pelo hook */
    }
  };

  const handleStatusChange = (o: Orcamento, status: OrcamentoStatus) => {
    if (status === o.status) return;
    statusMut.mutate({ id: o.id, status });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os orçamentos de venda enviados aos clientes
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Orçamentos
          </CardTitle>
          <CardDescription>
            {filtered.length} orçamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Buscar por número ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando orçamentos...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono font-semibold">{o.numero}</TableCell>
                      <TableCell>{o.clienteNome ?? '-'}</TableCell>
                      <TableCell>
                        {new Date(o.dataEmissao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {o.dataValidade
                          ? new Date(o.dataValidade).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">{brl(o.valorTotal)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(o.status)}>
                            {STATUS_LABEL[o.status]}
                          </Badge>
                          <Select
                            value={o.status}
                            onValueChange={(v) => handleStatusChange(o, v as OrcamentoStatus)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Empresa representada *</Label>
              <Select
                value={form.empresaRepresentadaId}
                onValueChange={(v) => setForm((p) => ({ ...p, empresaRepresentadaId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(empresas ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Número *</Label>
                <Input
                  value={form.numero}
                  onChange={(e) => setForm((p) => ({ ...p, numero: e.target.value }))}
                />
              </div>
              <div>
                <Label>Cliente</Label>
                <Select
                  value={form.clienteId || 'none'}
                  onValueChange={(v) => setForm((p) => ({ ...p, clienteId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem cliente</SelectItem>
                    {(clientes ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Emissão</Label>
                <Input
                  type="date"
                  value={form.dataEmissao}
                  onChange={(e) => setForm((p) => ({ ...p, dataEmissao: e.target.value }))}
                />
              </div>
              <div>
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={form.dataValidade}
                  onChange={(e) => setForm((p) => ({ ...p, dataValidade: e.target.value }))}
                />
              </div>
              <div>
                <Label>Valor total</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valorTotal}
                  onChange={(e) => setForm((p) => ({ ...p, valorTotal: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                rows={3}
                value={form.observacoes}
                onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orcamentos;
