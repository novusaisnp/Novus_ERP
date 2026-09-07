import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Plus, Loader2, Trash2 } from 'lucide-react';
import { useRequisicoesCompra } from '@/hooks/useRequisicoesCompra';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import { useProdutos } from '@/hooks/useProdutos';
import { usuarioService } from '@/services/usuarioService';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresaAtual } from '@/hooks/estoque/useEmpresaAtual';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useEmpresasLogosMap } from '@/hooks/useEmpresasLogosMap';
import { RequisicaoAcoesMenu } from '@/components/compras/RequisicaoAcoesMenu';
import { RequisicaoViewDialog } from '@/components/compras/RequisicaoViewDialog';
import type { RequisicaoCompra, RequisicaoCompraInput, RequisicaoCompraItemInput } from '@/types/requisicaoCompra';

const statusBadge: Record<RequisicaoCompra['status'], { label: string; variant: 'default' | 'secondary' }> = {
  ABERTA: { label: 'Aberta', variant: 'default' },
  CANCELADA: { label: 'Cancelada', variant: 'secondary' },
};

const emptyItem = (): RequisicaoCompraItemInput => ({ produto_id: '', quantidade: 1, observacao: '' });

const emptyForm = (): RequisicaoCompraInput => ({
  centro_custo_id: null,
  justificativa: '',
  data_necessidade: '',
  itens: [emptyItem()],
});

const RequisicoesCompra: React.FC = () => {
  const { requisicoes, isLoading, criar, isCriando, cancelar, isCancelando } = useRequisicoesCompra();
  const { centrosCusto } = useCentrosCusto();
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { data: usuarios = [] } = useQuery({ queryKey: ['usuarios-ativos'], queryFn: usuarioService.fetchUsuariosAtivos });
  const { user } = useAuth();

  const { data: empresaId } = useEmpresaAtual();
  const { empresas } = useEmpresasRepresentadas();
  const logosMapQ = useEmpresasLogosMap(empresas);
  const empresaAtual = (empresas ?? []).find((e) => e.id === empresaId);
  const empresaPdf = empresaAtual ? {
    nome: empresaAtual.nome,
    cnpj: empresaAtual.cnpj,
    email: empresaAtual.email,
    telefone: empresaAtual.telefone,
    endereco: empresaAtual.endereco,
    cidade: empresaAtual.cidade,
    estado: empresaAtual.estado,
    cep: empresaAtual.cep,
    logoUrl: empresaId ? logosMapQ.data?.get(empresaId) ?? null : null,
  } : null;

  const nomesPorUserId = new Map(usuarios.map((u) => [u.user_id, u.nome]));
  const nomesPorProdutoId = new Map(produtos.map((p) => [p.id, p.nome]));

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RequisicaoCompraInput>(emptyForm());
  const [cancelando, setCancelando] = useState<RequisicaoCompra | null>(null);
  const [visualizando, setVisualizando] = useState<RequisicaoCompra | null>(null);

  const setField = <K extends keyof RequisicaoCompraInput>(k: K, v: RequisicaoCompraInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setItem = (idx: number, patch: Partial<RequisicaoCompraItemInput>) =>
    setForm((p) => ({ ...p, itens: p.itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, emptyItem()] }));
  const removeItem = (idx: number) => setForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const openNew = () => { setForm(emptyForm()); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itensValidos = form.itens.filter((it) => it.produto_id && it.quantidade > 0);
    await criar({ ...form, itens: itensValidos });
    setOpen(false);
  };

  const nomeDe = (userId: string) => nomesPorUserId.get(userId) || userId.slice(0, 8);
  const nomeProduto = (produtoId: string) => nomesPorProdutoId.get(produtoId) || produtoId.slice(0, 8);
  const nomeCentroCusto = (id: string | null) => (id ? centrosCusto.find((c) => c.id === id)?.nome : null);

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Requisições de Compra</h1>
          <p className="text-muted-foreground">Pedido interno de material — quem precisa do quê, quando e por quê</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Requisição</Button>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && requisicoes.length === 0 && (
        <Card className="p-8 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma requisição de compra ainda</p>
        </Card>
      )}

      <div className="space-y-3">
        {requisicoes.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusBadge[r.status].variant}>{statusBadge[r.status].label}</Badge>
                    {nomeCentroCusto(r.centro_custo_id) && (
                      <span className="text-xs text-muted-foreground">{nomeCentroCusto(r.centro_custo_id)}</span>
                    )}
                  </div>
                  <p className="text-sm">{r.justificativa}</p>
                  <p className="text-xs text-muted-foreground">
                    Solicitante: {nomeDe(r.solicitante_id)}
                    {r.data_necessidade && <> · Necessário até: {new Date(r.data_necessidade + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
                  </p>
                </div>
                <RequisicaoAcoesMenu
                  requisicao={r}
                  empresa={empresaPdf}
                  solicitanteNome={nomeDe(r.solicitante_id)}
                  centroCustoNome={nomeCentroCusto(r.centro_custo_id)}
                  nomeProduto={nomeProduto}
                  podeCancelar={r.status === 'ABERTA' && r.solicitante_id === user?.id}
                  onView={() => setVisualizando(r)}
                  onCancel={() => setCancelando(r)}
                />
              </div>
              {r.itens.length > 0 && (
                <ul className="text-sm border-t pt-2 mt-2 space-y-1">
                  {r.itens.map((it) => (
                    <li key={it.id} className="flex justify-between text-muted-foreground">
                      <span>{nomeProduto(it.produto_id)}{it.observacao && ` — ${it.observacao}`}</span>
                      <span className="shrink-0 ml-2">{it.quantidade}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Nova Requisição de Compra</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Justificativa *</Label>
              <Textarea value={form.justificativa} onChange={(e) => setField('justificativa', e.target.value)} placeholder="Por que este material é necessário?" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Centro de Custo</Label>
                <Select value={form.centro_custo_id || undefined} onValueChange={(v) => setField('centro_custo_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    {centrosCusto.map((cc) => <SelectItem key={cc.id} value={cc.id}>{cc.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Necessário até</Label>
                <Input type="date" value={form.data_necessidade || ''} onChange={(e) => setField('data_necessidade', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" />Item
                </Button>
              </div>
              {loadingProdutos && <p className="text-xs text-muted-foreground">Carregando produtos…</p>}
              {!loadingProdutos && produtos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum produto cadastrado no Estoque ainda — cadastre em Estoque → Produtos antes de requisitar.
                </p>
              )}
              {form.itens.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Select value={item.produto_id || undefined} onValueChange={(v) => setItem(idx, { produto_id: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0.001} step="0.001" className="w-24"
                    value={item.quantidade || ''}
                    onChange={(e) => setItem(idx, { quantidade: Number(e.target.value) })}
                    placeholder="Qtd"
                  />
                  <Input
                    className="w-40" placeholder="Observação"
                    value={item.observacao || ''}
                    onChange={(e) => setItem(idx, { observacao: e.target.value })}
                  />
                  {form.itens.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCriando}>Cancelar</Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar requisição?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">"{cancelando?.justificativa}" deixará de estar aberta.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(null)} disabled={isCancelando}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={isCancelando}
              onClick={async () => { if (cancelando) { await cancelar(cancelando.id); setCancelando(null); } }}
            >
              {isCancelando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RequisicaoViewDialog
        requisicao={visualizando}
        empresa={empresaPdf}
        solicitanteNome={visualizando ? nomeDe(visualizando.solicitante_id) : ''}
        centroCustoNome={visualizando ? nomeCentroCusto(visualizando.centro_custo_id) : null}
        nomeProduto={nomeProduto}
        open={!!visualizando}
        onOpenChange={(o) => !o && setVisualizando(null)}
      />
    </div>
  );
};

export default RequisicoesCompra;
