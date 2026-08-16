import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integracaoPontoService, type IntegracaoPonto } from '@/services/integracaoPontoService';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Link2, Edit } from 'lucide-react';
import { toast } from 'sonner';

const empty = { id: '', nome: '', tipo: '', endpoint: '', token_autenticacao: '', configuracoes: '{}', ativo: true };

const IntegracaoPontoPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IntegracaoPonto | null>(null);
  const [form, setForm] = useState({ ...empty });

  const { data: integracoes = [], isLoading, error } = useQuery({
    queryKey: ['integracoes_ponto'],
    queryFn: integracaoPontoService.listIntegracoes,
  });

  const openNew = () => { setEditing(null); setForm({ ...empty }); setModalOpen(true); };
  const openEdit = (i: IntegracaoPonto) => {
    setEditing(i);
    setForm({
      id: i.id,
      nome: i.nome,
      tipo: i.tipo || '',
      endpoint: i.endpoint || '',
      // Nunca pré-preenche: o token não é lido de volta do banco (nem a
      // listagem nem esta tela o buscam). Deixar em branco ao salvar mantém
      // o valor já gravado; só troca se o usuário digitar um novo.
      token_autenticacao: '',
      configuracoes: i.configuracoes ? JSON.stringify(i.configuracoes, null, 2) : '{}',
      ativo: i.ativo !== false,
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let cfg: Json = null;
      try { cfg = form.configuracoes ? JSON.parse(form.configuracoes) : null; }
      catch { throw new Error('Configurações devem ser JSON válido'); }
      const payload = {
        nome: form.nome,
        tipo: form.tipo || null,
        endpoint: form.endpoint || null,
        token_autenticacao: form.token_autenticacao || null,
        configuracoes: cfg,
        ativo: form.ativo,
      };
      if (editing) {
        await integracaoPontoService.atualizarIntegracao(editing.id, payload);
      } else {
        await integracaoPontoService.criarIntegracao(payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integracoes_ponto'] });
      toast.success(editing ? 'Integração atualizada' : 'Integração criada');
      setModalOpen(false);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2">Integração de Ponto</h1>
          <p className="text-muted-foreground">Configure integrações com sistemas de ponto</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Integração</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Erro ao carregar</div>
          ) : integracoes.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma integração configurada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Sincronização</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {integracoes.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell>{i.tipo || '—'}</TableCell>
                    <TableCell className="max-w-xs truncate">{i.endpoint || '—'}</TableCell>
                    <TableCell><Badge variant={i.ativo ? 'default' : 'secondary'}>{i.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>{i.ultima_sincronizacao ? new Date(i.ultima_sincronizacao).toLocaleString('pt-BR') : 'Nunca'}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Edit className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar Integração' : 'Nova Integração'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REP">REP (Registrador Eletrônico)</SelectItem>
                    <SelectItem value="API">API REST</SelectItem>
                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Endpoint</Label><Input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} placeholder="https://..." /></div>
              <div className="col-span-2">
                <Label>Token de Autenticação</Label>
                <Input
                  type="password"
                  value={form.token_autenticacao}
                  onChange={(e) => setForm({ ...form, token_autenticacao: e.target.value })}
                  placeholder={editing ? 'Deixe em branco para manter o token atual' : ''}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div>
              <Label>Configurações (JSON)</Label>
              <Textarea rows={6} value={form.configuracoes} onChange={(e) => setForm({ ...form, configuracoes: e.target.value })} className="font-mono text-xs" />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.ativo} onCheckedChange={(c) => setForm({ ...form, ativo: c })} /><Label>Ativa</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.nome || saveMutation.isPending}>
              {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntegracaoPontoPage;
