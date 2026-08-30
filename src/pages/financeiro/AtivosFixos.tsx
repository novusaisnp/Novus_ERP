import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Box, Plus, Loader2, RefreshCw, ArrowDownCircle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAtivosFixos } from '@/hooks/useAtivosFixos';
import { useCentrosCusto } from '@/hooks/useCentrosCusto';
import type { AtivoFixo, AtivoFixoInput } from '@/types/ativoFixo';
import { currencyUtils } from '@/utils/currencyUtils';

const emptyForm = (): AtivoFixoInput => ({
  nome: '',
  descricao: '',
  categoria: '',
  centro_custo_id: null,
  data_aquisicao: new Date().toISOString().slice(0, 10),
  valor_aquisicao: 0,
  valor_residual: 0,
  vida_util_meses: 60,
});

const AtivosFixos: React.FC = () => {
  const { ativosFixos, isLoading, criar, isCreating, processarDepreciacao, isProcessandoDepreciacao, baixar, isBaixando } = useAtivosFixos();
  const { centrosCusto } = useCentrosCusto();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AtivoFixoInput>(emptyForm());
  const [baixando, setBaixando] = useState<AtivoFixo | null>(null);
  const [dataBaixa, setDataBaixa] = useState(new Date().toISOString().slice(0, 10));
  const [valorBaixa, setValorBaixa] = useState('');
  const [motivoBaixa, setMotivoBaixa] = useState('');
  const [confirmProcessar, setConfirmProcessar] = useState(false);

  const setField = <K extends keyof AtivoFixoInput>(k: K, v: AtivoFixoInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const ativos = ativosFixos.filter((a) => a.status === 'ATIVO');
  const baixados = ativosFixos.filter((a) => a.status === 'BAIXADO');
  const valorTotalAquisicao = ativosFixos.reduce((acc, a) => acc + a.valor_aquisicao, 0);
  const valorTotalDepreciado = ativos.reduce((acc, a) => acc + a.valor_depreciado_acumulado, 0);

  const openNew = () => { setForm(emptyForm()); setOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await criar(form);
    setOpen(false);
  };

  const openBaixa = (ativo: AtivoFixo) => {
    setBaixando(ativo);
    setDataBaixa(new Date().toISOString().slice(0, 10));
    setValorBaixa('0');
    setMotivoBaixa('');
  };

  const submitBaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baixando) return;
    await baixar({ id: baixando.id, dataBaixa, valorBaixa: currencyUtils.parseCurrency(valorBaixa) || 0, motivo: motivoBaixa });
    setBaixando(null);
  };

  const valorContabil = (a: AtivoFixo) => a.valor_aquisicao - a.valor_depreciado_acumulado;

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Ativos Fixos</h1>
          <p className="text-muted-foreground">Cadastro de bens, depreciação e baixa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setConfirmProcessar(true)} disabled={isProcessandoDepreciacao}>
            {isProcessandoDepreciacao ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Processar Depreciação do Mês
          </Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Novo Ativo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-primary">{ativos.length}</div>
          <p className="text-xs text-muted-foreground">Ativos em uso</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{baixados.length}</div>
          <p className="text-xs text-muted-foreground">Baixados</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold">{currencyUtils.formatCurrency(valorTotalAquisicao)}</div>
          <p className="text-xs text-muted-foreground">Valor de aquisição (total)</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-2xl font-bold text-accent">{currencyUtils.formatCurrency(valorTotalDepreciado)}</div>
          <p className="text-xs text-muted-foreground">Depreciado acumulado (ativos)</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <Card className="col-span-full p-8 text-center text-muted-foreground">Carregando…</Card>}
        {!isLoading && ativosFixos.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <span className="font-semibold truncate block">{a.nome}</span>
                  {a.categoria && <span className="text-xs text-muted-foreground">{a.categoria}</span>}
                </div>
                <Badge variant={a.status === 'ATIVO' ? 'default' : 'secondary'}>{a.status === 'ATIVO' ? 'Ativo' : 'Baixado'}</Badge>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Aquisição</span><span>{currencyUtils.formatCurrency(a.valor_aquisicao)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Depreciado</span><span>{currencyUtils.formatCurrency(a.valor_depreciado_acumulado)}</span></div>
                <div className="flex justify-between font-medium"><span className="text-muted-foreground">Valor contábil</span><span>{currencyUtils.formatCurrency(valorContabil(a))}</span></div>
              </div>
              {a.status === 'ATIVO' && (
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="outline" onClick={() => openBaixa(a)}>
                    <ArrowDownCircle className="w-3 h-3 mr-1" />Baixar
                  </Button>
                </div>
              )}
              {a.status === 'BAIXADO' && a.motivo_baixa && (
                <p className="text-xs text-muted-foreground pt-1">Baixa: {a.motivo_baixa}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && ativosFixos.length === 0 && (
          <Card className="col-span-full p-8 text-center">
            <Box className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhum ativo fixo cadastrado</p>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo Ativo Fixo</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setField('nome', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input value={form.categoria || ''} onChange={(e) => setField('categoria', e.target.value)} placeholder="Ex: Móveis, TI, Veículos" />
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
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao || ''} onChange={(e) => setField('descricao', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Aquisição *</Label>
                <Input type="date" value={form.data_aquisicao} onChange={(e) => setField('data_aquisicao', e.target.value)} required />
              </div>
              <div>
                <Label>Vida Útil (meses) *</Label>
                <Input type="number" min={1} value={form.vida_util_meses} onChange={(e) => setField('vida_util_meses', Number(e.target.value))} required />
              </div>
              <div>
                <Label>Valor de Aquisição *</Label>
                <Input type="number" step="0.01" min={0.01} value={form.valor_aquisicao || ''} onChange={(e) => setField('valor_aquisicao', Number(e.target.value))} required />
              </div>
              <div>
                <Label>Valor Residual</Label>
                <Input type="number" step="0.01" min={0} value={form.valor_residual || ''} onChange={(e) => setField('valor_residual', Number(e.target.value))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ao salvar, um lançamento contábil de aquisição é gerado automaticamente
              (Débito Imobilizado / Crédito Caixa e Bancos).
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!baixando} onOpenChange={(o) => !o && setBaixando(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Baixar Ativo: {baixando?.nome}</DialogTitle></DialogHeader>
          <form onSubmit={submitBaixa} className="space-y-4">
            <div>
              <Label>Data da Baixa *</Label>
              <Input type="date" value={dataBaixa} onChange={(e) => setDataBaixa(e.target.value)} required />
            </div>
            <div>
              <Label>Valor Recebido na Baixa</Label>
              <Input type="number" step="0.01" min={0} value={valorBaixa} onChange={(e) => setValorBaixa(e.target.value)} placeholder="0,00" />
              <p className="text-xs text-muted-foreground mt-1">Deixe 0 se o bem foi descartado sem venda.</p>
            </div>
            <div>
              <Label>Motivo *</Label>
              <Textarea value={motivoBaixa} onChange={(e) => setMotivoBaixa(e.target.value)} placeholder="Descreva o motivo (mínimo 5 caracteres)" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBaixando(null)} disabled={isBaixando}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={isBaixando}>
                {isBaixando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar Baixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmProcessar}
        onOpenChange={setConfirmProcessar}
        title="Processar depreciação do mês?"
        description="Gera o lançamento contábil de depreciação para todos os ativos pendentes na competência atual. Ativos já processados neste mês são ignorados."
        onConfirm={async () => { await processarDepreciacao(); setConfirmProcessar(false); }}
      />
    </div>
  );
};

export default AtivosFixos;
