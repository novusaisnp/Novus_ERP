import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
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
  useDeleteOrcamento,
  useDuplicarOrcamento,
} from '@/hooks/useOrcamentos';
import type {
  Orcamento,
  OrcamentoItem,
  OrcamentoStatus,
  TipoOrcamento,
  TipoItem,
} from '@/services/orcamentosService';
import { calcItemTotal, calcTotal } from '@/services/orcamentosService';
import { useClientes } from '@/hooks/useClientes';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useCatalogoProdutos } from '@/hooks/useCatalogoOrcamento';
import { CatalogoItemPicker } from '@/components/vendas/CatalogoItemPicker';
import { OrcamentoViewDialog } from '@/components/vendas/OrcamentoViewDialog';
import { OrcamentoAcoesMenu } from '@/components/vendas/OrcamentoAcoesMenu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ConverterVendaDialog } from '@/components/vendas/ConverterVendaDialog';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
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

const emptyItem = (tipoItem: TipoItem = 'P'): OrcamentoItem => ({
  tipoItem,
  descricao: '',
  quantidade: 1,
  precoUnitario: 0,
  desconto: 0,
});

const emptyForm = () => ({
  empresaRepresentadaId: '',
  numero: gerarNumero(),
  tipo: 'P' as TipoOrcamento,
  clienteId: '',
  dataEmissao: new Date().toISOString().slice(0, 10),
  dataValidade: '',
  status: 'rascunho' as OrcamentoStatus,
  observacoes: '',
  itens: [] as OrcamentoItem[],
});

const Orcamentos: React.FC = () => {
  const { data: orcamentos, isLoading } = useOrcamentos();
  const { clientes } = useClientes();
  const { empresas } = useEmpresasRepresentadas();
  const createMut = useCreateOrcamento();
  const statusMut = useUpdateOrcamentoStatus();
  const deleteMut = useDeleteOrcamento();
  const duplicarMut = useDuplicarOrcamento();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrcamentoStatus>('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [viewOrc, setViewOrc] = useState<Orcamento | null>(null);
  const [deleteOrc, setDeleteOrc] = useState<Orcamento | null>(null);
  const [converterOrc, setConverterOrc] = useState<Orcamento | null>(null);
  const produtosCatalogo = useCatalogoProdutos(form.empresaRepresentadaId || undefined);
  const estoquePorProduto = useMemo(() => {
    const m = new Map<string, { estoque: number; controla: boolean; nome: string }>();
    (produtosCatalogo.data ?? []).forEach((p) =>
      m.set(p.id, { estoque: p.estoque, controla: p.controlaEstoque, nome: p.nome }),
    );
    return m;
  }, [produtosCatalogo.data]);

  const empresaById = useMemo(() => {
    const m = new Map<string, (typeof empresas)[number]>();
    (empresas ?? []).forEach((e) => e.id && m.set(e.id, e));
    return m;
  }, [empresas]);

  const clienteById = useMemo(() => {
    const m = new Map<string, (typeof clientes)[number]>();
    (clientes ?? []).forEach((c) => c.id && m.set(c.id, c));
    return m;
  }, [clientes]);

  const logosMapQ = useEmpresasLogosMap(empresas);
  const logoOf = (empresaId: string) =>
    logosMapQ.data?.get(empresaId) ?? null;

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

  const totalForm = useMemo(() => calcTotal(form.itens), [form.itens]);

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      empresaRepresentadaId: empresas?.[0]?.id ?? '',
    });
    setOpen(true);
  };

  const defaultItemType = (): TipoItem =>
    form.tipo === 'S' ? 'S' : 'P';

  const addItem = () =>
    setForm((p) => ({
      ...p,
      itens: [...p.itens, emptyItem(p.tipo === 'S' ? 'S' : 'P')],
    }));

  const removeItem = (idx: number) =>
    setForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, patch: Partial<OrcamentoItem>) =>
    setForm((p) => ({
      ...p,
      itens: p.itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  // Coerção quando muda o tipo do orçamento
  const setTipo = (tipo: TipoOrcamento) =>
    setForm((p) => ({
      ...p,
      tipo,
      itens:
        tipo === 'H'
          ? p.itens
          : p.itens.map((it) => ({
              ...it,
              tipoItem: tipo === 'S' ? 'S' : 'P',
              produtoId: tipo === 'S' ? null : it.produtoId,
              servicoId: tipo === 'S' ? it.servicoId : null,
            })),
    }));

  const setItemTipo = (idx: number, tipoItem: TipoItem) => {
    updateItem(idx, {
      tipoItem,
      produtoId: null,
      servicoId: null,
      descricao: '',
      precoUnitario: 0,
    });
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
    if (form.status !== 'rascunho' && form.itens.length === 0) {
      toast.error('Adicione ao menos um item para status diferente de rascunho.');
      return;
    }
    for (const it of form.itens) {
      if (!it.descricao.trim()) {
        toast.error('Todos os itens precisam de descrição.');
        return;
      }
      if (!(Number(it.quantidade) > 0)) {
        toast.error('Quantidade deve ser maior que zero.');
        return;
      }
      if (it.tipoItem === 'P' && it.produtoId) {
        const info = estoquePorProduto.get(it.produtoId);
        if (info?.controla && Number(it.quantidade) > info.estoque) {
          toast.error(
            `Estoque insuficiente para "${info.nome}". Disponível: ${info.estoque}, solicitado: ${it.quantidade}.`,
          );
          return;
        }
      }
    }
    if (form.tipo === 'H' && form.itens.length > 0) {
      const hasP = form.itens.some((i) => i.tipoItem === 'P');
      const hasS = form.itens.some((i) => i.tipoItem === 'S');
      if (!(hasP && hasS)) {
        toast.error('Orçamento HÍBRIDO exige ao menos 1 item de PRODUTO e 1 de SERVIÇO.');
        return;
      }
    }
    try {
      await createMut.mutateAsync({
        empresaRepresentadaId: form.empresaRepresentadaId,
        numero: form.numero.trim(),
        tipo: form.tipo,
        clienteId: form.clienteId || null,
        dataEmissao: form.dataEmissao,
        dataValidade: form.dataValidade || null,
        valorTotal: totalForm,
        observacoes: form.observacoes || null,
        status: form.status,
        itens: form.itens,
      });
      setOpen(false);
    } catch {
      /* toast pelo hook */
    }
  };
  void defaultItemType;

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
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando orçamentos...
                    </TableCell>
                  </TableRow>
                ) : filtered.length > 0 ? (
                  filtered.map((o) => {
                    const emp = empresaById.get(o.empresaRepresentadaId);
                    const cli = o.clienteId ? clienteById.get(o.clienteId) : undefined;
                    const empresaPdf = emp
                      ? {
                          nome: emp.nome,
                          cnpj: emp.cnpj,
                          email: emp.email,
                          telefone: emp.telefone,
                          endereco: emp.endereco,
                          cidade: emp.cidade,
                          estado: emp.estado,
                          cep: emp.cep,
                          logoUrl: logoOf(o.empresaRepresentadaId),
                        }
                      : null;
                    const clientePdf = cli
                      ? {
                          nome: cli.nome,
                          cnpj: cli.tipo === 'J' ? cli.cpfCnpj : null,
                          cpf: cli.tipo === 'F' ? cli.cpfCnpj : null,
                          email: cli.emails?.[0] ?? null,
                          telefone: cli.telefones?.[0] ?? null,
                          cidade: cli.endereco?.cidade ?? null,
                          estado: cli.endereco?.uf ?? null,
                        }
                      : { nome: o.clienteNome };
                    return (
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
                        <TableCell className="text-center">{o.itens?.length ?? 0}</TableCell>
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
                        <TableCell className="text-right">
                          <OrcamentoAcoesMenu
                            orcamento={o}
                            empresa={empresaPdf}
                            cliente={clientePdf}
                            clienteTelefone={cli?.telefones?.[0]}
                            clienteEmail={cli?.emails?.[0]}
                            onView={() => setViewOrc(o)}
                            onDuplicate={() => duplicarMut.mutate(o.id)}
                            onDelete={() => setDeleteOrc(o)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((p) => ({ ...p, status: v as OrcamentoStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Tipo do orçamento *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setTipo(v as TipoOrcamento)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="P">Produtos (NF-e)</SelectItem>
                  <SelectItem value="S">Serviços (NFS-e)</SelectItem>
                  <SelectItem value="H">Híbrido (NF-e + NFS-e)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {form.tipo === 'P' && 'Somente itens de produto; emite NF-e.'}
                {form.tipo === 'S' && 'Somente itens de serviço; emite NFS-e.'}
                {form.tipo === 'H' && 'Combina produtos e serviços; emite NF-e e NFS-e no split fiscal.'}
              </p>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Itens</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar item
                </Button>
              </div>
              {form.itens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum item adicionado.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.itens.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      {form.tipo === 'H' && (
                        <div className="col-span-2">
                          {idx === 0 && <Label className="text-xs">Tipo</Label>}
                          <Select
                            value={it.tipoItem}
                            onValueChange={(v) => setItemTipo(idx, v as TipoItem)}
                          >
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="P">Produto</SelectItem>
                              <SelectItem value="S">Serviço</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className={form.tipo === 'H' ? 'col-span-3' : 'col-span-5'}>
                        {idx === 0 && <Label className="text-xs">Descrição</Label>}
                        <CatalogoItemPicker
                          tipoItem={it.tipoItem}
                          empresaId={form.empresaRepresentadaId}
                          value={it.descricao}
                          selectedId={it.tipoItem === 'P' ? it.produtoId ?? undefined : it.servicoId ?? undefined}
                          onSelect={(sel) =>
                            updateItem(idx, {
                              descricao: sel.descricao,
                              precoUnitario: sel.preco,
                              produtoId: it.tipoItem === 'P' ? sel.id : null,
                              servicoId: it.tipoItem === 'S' ? sel.id : null,
                            })
                          }
                          onChangeText={(txt) =>
                            updateItem(idx, {
                              descricao: txt,
                              produtoId: null,
                              servicoId: null,
                            })
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <Label className="text-xs">Qtd</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.quantidade}
                          onChange={(e) => updateItem(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <Label className="text-xs">Preço</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.precoUnitario}
                          onChange={(e) => updateItem(idx, { precoUnitario: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-2">
                        {idx === 0 && <Label className="text-xs">Desc.</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={it.desconto ?? 0}
                          onChange={(e) => updateItem(idx, { desconto: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(idx)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="col-span-12 text-right text-xs text-muted-foreground -mt-1">
                        Subtotal: {brl(calcItemTotal(it))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end pt-2 border-t">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{brl(totalForm)}</div>
                </div>
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

      <OrcamentoViewDialog
        orcamento={viewOrc}
        empresa={
          viewOrc
            ? (() => {
                const e = empresaById.get(viewOrc.empresaRepresentadaId);
                return e
                  ? {
                      nome: e.nome,
                      cnpj: e.cnpj,
                      email: e.email,
                      telefone: e.telefone,
                      endereco: e.endereco,
                      cidade: e.cidade,
                      estado: e.estado,
                      cep: e.cep,
                      logoUrl: logoOf(viewOrc.empresaRepresentadaId),
                    }
                  : null;
              })()
            : null
        }
        cliente={
          viewOrc && viewOrc.clienteId
            ? (() => {
                const c = clienteById.get(viewOrc.clienteId);
                if (!c) return { nome: viewOrc.clienteNome };
                return {
                  nome: c.nome,
                  cnpj: c.tipo === 'J' ? c.cpfCnpj : null,
                  cpf: c.tipo === 'F' ? c.cpfCnpj : null,
                  email: c.emails?.[0] ?? null,
                  telefone: c.telefones?.[0] ?? null,
                  cidade: c.endereco?.cidade ?? null,
                  estado: c.endereco?.uf ?? null,
                };
              })()
            : { nome: viewOrc?.clienteNome ?? null }
        }
        open={!!viewOrc}
        onOpenChange={(v) => !v && setViewOrc(null)}
      />

      <ConfirmDialog
        open={!!deleteOrc}
        onOpenChange={(v) => !v && setDeleteOrc(null)}
        title="Excluir orçamento"
        description={`Deseja excluir o orçamento ${deleteOrc?.numero ?? ''}? Esta ação pode ser revertida pelo administrador.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (deleteOrc) deleteMut.mutate(deleteOrc.id);
          setDeleteOrc(null);
        }}
      />
    </div>
  );
};

export default Orcamentos;
