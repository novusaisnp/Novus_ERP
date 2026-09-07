import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, Plus, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCotacoesCompra } from '@/hooks/useCotacoesCompra';
import { useRequisicoesCompra } from '@/hooks/useRequisicoesCompra';
import { useFornecedores } from '@/hooks/useFornecedores';
import type { Fornecedor } from '@/types/fornecedor';
import type { CotacaoCompra, CotacaoCompraInput } from '@/types/cotacaoCompra';

const nomeDoFornecedor = (f: Fornecedor) => f.razaoSocial || f.nomeFantasia || f.nome_completo || 'Fornecedor';

const statusBadge: Record<CotacaoCompra['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  ABERTA: { label: 'Aberta', variant: 'default' },
  FECHADA: { label: 'Fechada', variant: 'secondary' },
  CANCELADA: { label: 'Cancelada', variant: 'destructive' },
};

const emptyForm = (): CotacaoCompraInput => ({ requisicao_id: '', prazo_resposta: '', observacoes: '', fornecedor_ids: [] });

const CotacoesCompra: React.FC = () => {
  const { cotacoes, isLoading, criar, isCriando } = useCotacoesCompra();
  const { requisicoes } = useRequisicoesCompra();
  const { fornecedores } = useFornecedores();
  const navigate = useNavigate();

  const requisicoesAbertas = requisicoes.filter((r) => r.status === 'ABERTA');
  const nomeFornecedor = (id: string) => {
    const f = fornecedores.find((x) => x.id === id);
    return f ? nomeDoFornecedor(f) : id.slice(0, 8);
  };
  const requisicaoDe = (id: string) => requisicoes.find((r) => r.id === id);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CotacaoCompraInput>(emptyForm());

  const setField = <K extends keyof CotacaoCompraInput>(k: K, v: CotacaoCompraInput[K]) => setForm((p) => ({ ...p, [k]: v }));

  const toggleFornecedor = (id: string) =>
    setForm((p) => ({
      ...p,
      fornecedor_ids: p.fornecedor_ids.includes(id) ? p.fornecedor_ids.filter((x) => x !== id) : [...p.fornecedor_ids, id],
    }));

  const openNew = () => { setForm(emptyForm()); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cotacao = await criar(form);
    setOpen(false);
    navigate(`/compras/cotacoes/${cotacao.id}`);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Cotações de Compra</h1>
          <p className="text-muted-foreground">Mapa comparativo de preços entre fornecedores, a partir de uma requisição aberta</p>
        </div>
        <Button onClick={openNew} disabled={requisicoesAbertas.length === 0}><Plus className="w-4 h-4 mr-2" />Nova Cotação</Button>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && cotacoes.length === 0 && (
        <Card className="p-8 text-center">
          <FileSearch className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma cotação ainda</p>
        </Card>
      )}

      <div className="space-y-3">
        {cotacoes.map((c) => {
          const req = requisicaoDe(c.requisicao_id);
          return (
            <Card key={c.id} className="cursor-pointer hover:bg-accent/40" onClick={() => navigate(`/compras/cotacoes/${c.id}`)}>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusBadge[c.status].variant}>{statusBadge[c.status].label}</Badge>
                  <span className="text-sm font-medium">{req?.justificativa || c.requisicao_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.fornecedores.map((cf) => nomeFornecedor(cf.fornecedor_id)).join(', ') || 'Nenhum fornecedor convidado'}
                  {c.prazo_resposta && <> · Prazo de resposta: {new Date(c.prazo_resposta + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Cotação de Compra</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Requisição *</Label>
              <Select value={form.requisicao_id || undefined} onValueChange={(v) => setField('requisicao_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a requisição" /></SelectTrigger>
                <SelectContent>
                  {requisicoesAbertas.map((r) => <SelectItem key={r.id} value={r.id}>{r.justificativa}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo de resposta</Label>
              <Input type="date" value={form.prazo_resposta || ''} onChange={(e) => setField('prazo_resposta', e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ''} onChange={(e) => setField('observacoes', e.target.value)} />
            </div>
            <div>
              <Label>Fornecedores a convidar *</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {fornecedores.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhum fornecedor cadastrado.</p>}
                {fornecedores.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm p-1 rounded hover:bg-accent cursor-pointer">
                    <Checkbox checked={form.fornecedor_ids.includes(f.id!)} onCheckedChange={() => toggleFornecedor(f.id!)} />
                    {nomeDoFornecedor(f)}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCriando}>Cancelar</Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Cotação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CotacoesCompra;
