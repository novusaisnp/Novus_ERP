import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Factory, Plus, Loader2, XCircle, CheckCircle2 } from 'lucide-react';
import { useOrdensFabricacao } from '@/hooks/useOrdensFabricacao';
import { useFichasTecnicas } from '@/hooks/useFichasTecnicas';
import { useLocalizacoes } from '@/hooks/useLocalizacoes';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import { useProdutos } from '@/hooks/useProdutos';
import type {
  OrdemFabricacao,
  OrdemFabricacaoStatus,
  CriarOrdemFabricacaoInput,
  ConcluirOrdemFabricacaoConsumoInput,
} from '@/types/producao';

const statusBadge: Record<OrdemFabricacaoStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  RASCUNHO: { label: 'Em Aberto', variant: 'outline' },
  CONCLUIDA: { label: 'Concluída', variant: 'default' },
  CANCELADA: { label: 'Cancelada', variant: 'secondary' },
};

const emptyForm = (): CriarOrdemFabricacaoInput => ({
  ficha_tecnica_id: '',
  quantidade_planejada: 1,
  localizacao_consumo_id: '',
  localizacao_producao_id: '',
  centro_custo_id: null,
  observacoes: '',
});

const OrdensFabricacao: React.FC = () => {
  const { ordens, isLoading, criar, isCriando, concluir, isConcluindo, cancelar, isCancelando } = useOrdensFabricacao();
  const { fichasTecnicas } = useFichasTecnicas();
  const { data: localizacoes = [] } = useLocalizacoes();
  const { centrosCusto } = useCentrosCusto();
  const { produtos } = useProdutos();

  const fichasAtivas = fichasTecnicas.filter((f) => f.ativo);
  const nomesPorProdutoId = new Map(produtos.map((p) => [p.id, p.nome]));
  const nomeProduto = (produtoId: string) => nomesPorProdutoId.get(produtoId) || produtoId.slice(0, 8);
  const nomeLocalizacao = (id: string) => localizacoes.find((l) => l.id === id)?.nome || id.slice(0, 8);
  const nomeFicha = (id: string) => fichasTecnicas.find((f) => f.id === id)?.nome || id.slice(0, 8);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CriarOrdemFabricacaoInput>(emptyForm());
  const [cancelando, setCancelando] = useState<OrdemFabricacao | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [concluindo, setConcluindo] = useState<OrdemFabricacao | null>(null);
  const [quantidadeProduzida, setQuantidadeProduzida] = useState(0);
  const [consumosForm, setConsumosForm] = useState<ConcluirOrdemFabricacaoConsumoInput[]>([]);

  const setField = <K extends keyof CriarOrdemFabricacaoInput>(k: K, v: CriarOrdemFabricacaoInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const openNew = () => { setForm(emptyForm()); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criar(form);
    setOpen(false);
  };

  const abrirConcluir = (ordem: OrdemFabricacao) => {
    setConcluindo(ordem);
    setQuantidadeProduzida(ordem.quantidade_planejada);
    setConsumosForm(ordem.consumos.map((c) => ({
      produto_insumo_id: c.produto_insumo_id,
      quantidade_consumida: c.quantidade_planejada,
    })));
  };

  const setConsumoQtd = (produtoInsumoId: string, qtd: number) =>
    setConsumosForm((p) => p.map((c) => (c.produto_insumo_id === produtoInsumoId ? { ...c, quantidade_consumida: qtd } : c)));

  const confirmarConclusao = async () => {
    if (!concluindo) return;
    await concluir({ ordem_id: concluindo.id, quantidade_produzida: quantidadeProduzida, consumos: consumosForm });
    setConcluindo(null);
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Ordens de Fabricação</h1>
          <p className="text-muted-foreground">Consome os insumos da ficha técnica e gera o produto acabado com custo real</p>
        </div>
        <Button onClick={openNew} disabled={fichasAtivas.length === 0}><Plus className="w-4 h-4 mr-2" />Nova Ordem</Button>
      </div>

      {!isLoading && fichasAtivas.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma ficha técnica ativa — cadastre uma em Produção → Fichas Técnicas antes de abrir uma ordem.
        </Card>
      )}

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && ordens.length === 0 && fichasAtivas.length > 0 && (
        <Card className="p-8 text-center">
          <Factory className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhuma ordem de fabricação ainda</p>
        </Card>
      )}

      <div className="space-y-3">
        {ordens.map((o) => (
          <Card key={o.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusBadge[o.status].variant}>{statusBadge[o.status].label}</Badge>
                    <span className="font-medium">{nomeProduto(o.produto_id)}</span>
                    <span className="text-xs text-muted-foreground">via {nomeFicha(o.ficha_tecnica_id)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Planejado: {o.quantidade_planejada}
                    {o.quantidade_produzida != null && <> · Produzido: {o.quantidade_produzida}</>}
                    {' · '}Consumo em {nomeLocalizacao(o.localizacao_consumo_id)} → Produção em {nomeLocalizacao(o.localizacao_producao_id)}
                  </p>
                  {o.status === 'CONCLUIDA' && (
                    <p className="text-sm text-muted-foreground">
                      Custo total: {o.custo_total_producao?.toFixed(2)} · Custo unitário: {o.custo_unitario_producao?.toFixed(4)}
                    </p>
                  )}
                  {o.status === 'CANCELADA' && o.motivo_cancelamento && (
                    <p className="text-sm text-muted-foreground">Motivo: {o.motivo_cancelamento}</p>
                  )}
                </div>
                {o.status === 'RASCUNHO' && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => abrirConcluir(o)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" />Concluir Produção
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setCancelando(o); setMotivoCancelamento(''); }}>
                      <XCircle className="w-4 h-4 mr-1 text-destructive" />Cancelar
                    </Button>
                  </div>
                )}
              </div>
              {o.consumos.length > 0 && (
                <ul className="text-sm border-t pt-2 mt-2 space-y-1">
                  {o.consumos.map((c) => (
                    <li key={c.id} className="flex justify-between text-muted-foreground">
                      <span>{nomeProduto(c.produto_insumo_id)}</span>
                      <span className="shrink-0 ml-2">
                        {c.quantidade_consumida != null ? `${c.quantidade_consumida} consumido` : `${c.quantidade_planejada} planejado`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Nova ordem */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Ordem de Fabricação</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Ficha Técnica *</Label>
              <Select value={form.ficha_tecnica_id || undefined} onValueChange={(v) => setField('ficha_tecnica_id', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o que vai fabricar" /></SelectTrigger>
                <SelectContent>
                  {fichasAtivas.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome} — {nomeProduto(f.produto_id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade Planejada *</Label>
              <Input
                type="number" min={0.0001} step="0.0001"
                value={form.quantidade_planejada || ''}
                onChange={(e) => setField('quantidade_planejada', Number(e.target.value))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Localização de Consumo *</Label>
                <Select value={form.localizacao_consumo_id || undefined} onValueChange={(v) => setField('localizacao_consumo_id', v)}>
                  <SelectTrigger><SelectValue placeholder="De onde sai o insumo" /></SelectTrigger>
                  <SelectContent>
                    {localizacoes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Localização de Produção *</Label>
                <Select value={form.localizacao_producao_id || undefined} onValueChange={(v) => setField('localizacao_producao_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Para onde vai o produto" /></SelectTrigger>
                  <SelectContent>
                    {localizacoes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
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
              <Label>Observações</Label>
              <Textarea value={form.observacoes || ''} onChange={(e) => setField('observacoes', e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCriando}>Cancelar</Button>
              <Button type="submit" disabled={isCriando}>
                {isCriando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Abrir Ordem
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Concluir produção */}
      <Dialog open={!!concluindo} onOpenChange={(o) => !o && setConcluindo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Concluir Produção</DialogTitle></DialogHeader>
          {concluindo && (
            <div className="space-y-4">
              <div>
                <Label>Quantidade Produzida *</Label>
                <Input
                  type="number" min={0.0001} step="0.0001"
                  value={quantidadeProduzida || ''}
                  onChange={(e) => setQuantidadeProduzida(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Consumo real de cada insumo</Label>
                {consumosForm.map((c) => (
                  <div key={c.produto_insumo_id} className="flex items-center gap-2">
                    <span className="flex-1 text-sm">{nomeProduto(c.produto_insumo_id)}</span>
                    <Input
                      type="number" min={0} step="0.0001" className="w-28"
                      value={c.quantidade_consumida}
                      onChange={(e) => setConsumoQtd(c.produto_insumo_id, Number(e.target.value))}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Pré-preenchido com a quantidade planejada — ajuste se o consumo real foi diferente.</p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConcluindo(null)} disabled={isConcluindo}>Voltar</Button>
                <Button onClick={confirmarConclusao} disabled={isConcluindo}>
                  {isConcluindo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Conclusão
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancelar */}
      <Dialog open={!!cancelando} onOpenChange={(o) => !o && setCancelando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar ordem de fabricação?</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} placeholder="Por que esta ordem está sendo cancelada?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelando(null)} disabled={isCancelando}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={isCancelando || motivoCancelamento.trim().length < 5}
              onClick={async () => { if (cancelando) { await cancelar({ id: cancelando.id, motivo: motivoCancelamento }); setCancelando(null); } }}
            >
              {isCancelando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdensFabricacao;
