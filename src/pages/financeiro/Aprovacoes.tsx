import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, Plus, Loader2, Check, X, Ban } from 'lucide-react';
import { useSolicitacoesAprovacao } from '@/hooks/useSolicitacoesAprovacao';
import { useAuth } from '@/contexts/AuthContext';
import type { SolicitacaoAprovacao, SolicitarAprovacaoInput, StatusSolicitacaoAprovacao } from '@/types/alcadas';
import { currencyUtils } from '@/utils/currencyUtils';
import { cn } from '@/lib/utils';

const statusBadge: Record<StatusSolicitacaoAprovacao, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PENDENTE: { label: 'Pendente', variant: 'outline' },
  APROVADO: { label: 'Aprovado', variant: 'default' },
  AUTO_APROVADO: { label: 'Auto-aprovado', variant: 'default' },
  REJEITADO: { label: 'Rejeitado', variant: 'destructive' },
  CANCELADO: { label: 'Cancelado', variant: 'secondary' },
};

const emptyForm = (): SolicitarAprovacaoInput => ({ categoria: '', valor: 0, descricao: '' });

const Aprovacoes: React.FC = () => {
  const { solicitacoes, isLoading, nomesPorUserId, solicitar, isSolicitando, decidir, isDecidindo, cancelar, isCancelando } = useSolicitacoesAprovacao();
  const { user } = useAuth();
  const meuId = user?.id;

  const [openNova, setOpenNova] = useState(false);
  const [form, setForm] = useState<SolicitarAprovacaoInput>(emptyForm());

  const [decidindo, setDecidindo] = useState<{ sol: SolicitacaoAprovacao; decisao: 'APROVADO' | 'REJEITADO' } | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const setField = <K extends keyof SolicitarAprovacaoInput>(k: K, v: SolicitarAprovacaoInput[K]) => setForm((p) => ({ ...p, [k]: v }));

  const pendentesDeOutros = solicitacoes.filter((s) => s.status === 'PENDENTE' && s.solicitante_id !== meuId);
  const minhas = solicitacoes.filter((s) => s.solicitante_id === meuId);
  const historico = solicitacoes.filter((s) => s.status !== 'PENDENTE');

  const nomeDe = (userId: string | null) => (userId ? nomesPorUserId.get(userId) || userId.slice(0, 8) : '—');

  const submitNova = async (e: React.FormEvent) => {
    e.preventDefault();
    await solicitar(form);
    setOpenNova(false);
    setForm(emptyForm());
  };

  const abrirDecisao = (sol: SolicitacaoAprovacao, decisao: 'APROVADO' | 'REJEITADO') => {
    setDecidindo({ sol, decisao });
    setJustificativa('');
  };

  const confirmarDecisao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decidindo) return;
    await decidir({ id: decidindo.sol.id, decisao: decidindo.decisao, justificativa });
    setDecidindo(null);
  };

  const linhaCard = (s: SolicitacaoAprovacao, acoes?: React.ReactNode) => (
    <Card key={s.id}>
      <CardContent className="p-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{s.categoria}</span>
            <Badge variant={statusBadge[s.status].variant}>{statusBadge[s.status].label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{s.descricao}</p>
          <p className="text-xs text-muted-foreground">
            Valor: <span className="font-medium text-foreground">{currencyUtils.formatCurrency(s.valor)}</span>
            {' · '}Solicitante: {nomeDe(s.solicitante_id)}
            {s.decidido_por && <> · Decidido por: {nomeDe(s.decidido_por)}</>}
          </p>
          {s.justificativa_decisao && (
            <p className={cn('text-xs italic', s.status === 'REJEITADO' ? 'text-destructive' : 'text-muted-foreground')}>
              "{s.justificativa_decisao}"
            </p>
          )}
        </div>
        {acoes && <div className="flex gap-2 shrink-0">{acoes}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1">Central de Aprovações</h1>
          <p className="text-muted-foreground">Solicitações de aprovação por alçada — pendentes, minhas e histórico</p>
        </div>
        <Button onClick={() => setOpenNova(true)}><Plus className="w-4 h-4 mr-2" />Nova Solicitação</Button>
      </div>

      {isLoading && <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>}

      {!isLoading && (
        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes">Aguardando decisão ({pendentesDeOutros.length})</TabsTrigger>
            <TabsTrigger value="minhas">Minhas solicitações ({minhas.length})</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-3 mt-4">
            {pendentesDeOutros.length === 0 && (
              <Card className="p-8 text-center">
                <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Nenhuma solicitação aguardando sua decisão</p>
              </Card>
            )}
            {pendentesDeOutros.map((s) => linhaCard(s, (
              <>
                <Button size="sm" variant="outline" onClick={() => abrirDecisao(s, 'APROVADO')}><Check className="w-3 h-3 mr-1" />Aprovar</Button>
                <Button size="sm" variant="destructive" onClick={() => abrirDecisao(s, 'REJEITADO')}><X className="w-3 h-3 mr-1" />Rejeitar</Button>
              </>
            )))}
          </TabsContent>

          <TabsContent value="minhas" className="space-y-3 mt-4">
            {minhas.length === 0 && <Card className="p-8 text-center text-muted-foreground">Você ainda não abriu nenhuma solicitação</Card>}
            {minhas.map((s) => linhaCard(s, s.status === 'PENDENTE' ? (
              <Button size="sm" variant="outline" disabled={isCancelando} onClick={() => cancelar(s.id)}>
                <Ban className="w-3 h-3 mr-1" />Cancelar
              </Button>
            ) : undefined))}
          </TabsContent>

          <TabsContent value="historico" className="space-y-3 mt-4">
            {historico.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nenhuma decisão registrada ainda</Card>}
            {historico.map((s) => linhaCard(s))}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={openNova} onOpenChange={setOpenNova}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Solicitação de Aprovação</DialogTitle></DialogHeader>
          <form onSubmit={submitNova} className="space-y-4">
            <div>
              <Label>Categoria *</Label>
              <Input value={form.categoria} onChange={(e) => setField('categoria', e.target.value)} placeholder="Ex: COMPRA" required />
            </div>
            <div>
              <Label>Valor *</Label>
              <Input type="number" step="0.01" min={0} value={form.valor || ''} onChange={(e) => setField('valor', Number(e.target.value))} required />
            </div>
            <div>
              <Label>Descrição *</Label>
              <Textarea value={form.descricao} onChange={(e) => setField('descricao', e.target.value)} required />
            </div>
            <p className="text-xs text-muted-foreground">
              Se não houver alçada configurada para essa categoria/valor, a solicitação é aprovada automaticamente.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenNova(false)} disabled={isSolicitando}>Cancelar</Button>
              <Button type="submit" disabled={isSolicitando}>
                {isSolicitando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enviar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!decidindo} onOpenChange={(o) => !o && setDecidindo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{decidindo?.decisao === 'APROVADO' ? 'Aprovar' : 'Rejeitar'} solicitação</DialogTitle>
          </DialogHeader>
          <form onSubmit={confirmarDecisao} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {decidindo?.sol.categoria} — {decidindo && currencyUtils.formatCurrency(decidindo.sol.valor)}
            </p>
            <div>
              <Label>Justificativa {decidindo?.decisao === 'REJEITADO' && '*'}</Label>
              <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} required={decidindo?.decisao === 'REJEITADO'} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDecidindo(null)} disabled={isDecidindo}>Cancelar</Button>
              <Button type="submit" variant={decidindo?.decisao === 'REJEITADO' ? 'destructive' : 'default'} disabled={isDecidindo}>
                {isDecidindo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Confirmar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aprovacoes;
