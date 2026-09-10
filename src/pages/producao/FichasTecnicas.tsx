import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Plus, Loader2, Trash2, XCircle } from 'lucide-react';
import { useFichasTecnicas } from '@/hooks/useFichasTecnicas';
import { useProdutos } from '@/hooks/useProdutos';
import type { FichaTecnicaComItens, FichaTecnicaInput, FichaTecnicaItemInput } from '@/types/producao';

const emptyItem = (): FichaTecnicaItemInput => ({ produto_insumo_id: '', quantidade: 1 });

const emptyForm = (): FichaTecnicaInput => ({
  produto_id: '',
  nome: '',
  observacoes: '',
  itens: [emptyItem()],
});

const FichasTecnicas: React.FC = () => {
  const { fichasTecnicas, isLoading, criar, isCriando, desativar, isDesativando } = useFichasTecnicas();
  const { produtos, loading: loadingProdutos } = useProdutos();

  const nomesPorProdutoId = new Map(produtos.map((p) => [p.id, p.nome]));
  const nomeProduto = (produtoId: string) => nomesPorProdutoId.get(produtoId) || produtoId.slice(0, 8);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FichaTecnicaInput>(emptyForm());
  const [desativando, setDesativando] = useState<FichaTecnicaComItens | null>(null);

  const setField = <K extends keyof FichaTecnicaInput>(k: K, v: FichaTecnicaInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const setItem = (idx: number, patch: Partial<FichaTecnicaItemInput>) =>
    setForm((p) => ({ ...p, itens: p.itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)) }));

  const addItem = () => setForm((p) => ({ ...p, itens: [...p.itens, emptyItem()] }));
  const removeItem = (idx: number) => setForm((p) => ({ ...p, itens: p.itens.filter((_, i) => i !== idx) }));

  const openNew = () => { setForm(emptyForm()); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itensValidos = form.itens.filter((it) => it.produto_insumo_id && it.quantidade > 0);
    await criar({ ...form, itens: itensValidos });
    setOpen(false);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Fichas Técnicas</h1>
          <p className="text-muted-foreground">Composição (BOM) de cada produto fabricado — quais insumos e em que quantidade</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nova Ficha Técnica</Button>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && fichasTecnicas.length === 0 && (
        <Card className="p-8 text-center">
          <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma ficha técnica cadastrada ainda</p>
        </Card>
      )}

      <div className="space-y-3">
        {fichasTecnicas.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={f.ativo ? 'default' : 'secondary'}>{f.ativo ? 'Ativa' : 'Inativa'}</Badge>
                    <span className="font-medium">{f.nome}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Produto: {nomeProduto(f.produto_id)}</p>
                  {f.observacoes && <p className="text-sm text-muted-foreground">{f.observacoes}</p>}
                </div>
                {f.ativo && (
                  <Button variant="ghost" size="sm" onClick={() => setDesativando(f)}>
                    <XCircle className="w-4 h-4 mr-1 text-destructive" />Desativar
                  </Button>
                )}
              </div>
              {f.itens.length > 0 && (
                <ul className="text-sm border-t pt-2 mt-2 space-y-1">
                  {f.itens.map((it) => (
                    <li key={it.id} className="flex justify-between text-muted-foreground">
                      <span>{nomeProduto(it.produto_insumo_id)}</span>
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
          <DialogHeader><DialogTitle>Nova Ficha Técnica</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Produto Acabado *</Label>
                <Select value={form.produto_id || undefined} onValueChange={(v) => setField('produto_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o produto fabricado" /></SelectTrigger>
                  <SelectContent>
                    {produtos.map((p) => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome da Ficha *</Label>
                <Input value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Ex.: Ficha Técnica Padrão" required />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ''} onChange={(e) => setField('observacoes', e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Insumos *</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" />Insumo
                </Button>
              </div>
              {loadingProdutos && <p className="text-xs text-muted-foreground">Carregando produtos…</p>}
              {form.itens.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Select value={item.produto_insumo_id || undefined} onValueChange={(v) => setItem(idx, { produto_insumo_id: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione o insumo" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map((p) => <SelectItem key={p.id} value={p.id!}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={0.0001} step="0.0001" className="w-28"
                    value={item.quantidade || ''}
                    onChange={(e) => setItem(idx, { quantidade: Number(e.target.value) })}
                    placeholder="Qtd. por unidade"
                  />
                  {form.itens.length > 1 && (
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Quantidade necessária de cada insumo para produzir 1 unidade do produto acabado.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCriando}>Cancelar</Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!desativando} onOpenChange={(o) => !o && setDesativando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Desativar ficha técnica?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{desativando?.nome}" deixará de aparecer para abrir novas ordens de fabricação. Ordens já abertas não são afetadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDesativando(null)} disabled={isDesativando}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={isDesativando}
              onClick={async () => { if (desativando) { await desativar(desativando.id); setDesativando(null); } }}
            >
              {isDesativando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Desativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FichasTecnicas;
