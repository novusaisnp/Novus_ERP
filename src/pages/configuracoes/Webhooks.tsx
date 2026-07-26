import React, { useMemo, useState } from 'react';
import { useEmpresasRepresentadas } from '@/hooks/useEmpresasRepresentadas';
import { useWebhookConfigs } from '@/hooks/useWebhookConfigs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Copy, Webhook, Power, KeyRound, Shield, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { WebhookConfigModal } from '@/components/configuracoes/WebhookConfigModal';
import { RotateSecretDialog } from '@/components/configuracoes/RotateSecretDialog';
import { TestSignatureDialog } from '@/components/configuracoes/TestSignatureDialog';
import type { WebhookConfig, WebhookConfigInput } from '@/types/webhookConfig';

const Webhooks: React.FC = () => {
  const { empresas, loading: loadingEmpresas } = useEmpresasRepresentadas();
  const [empresaSel, setEmpresaSel] = useState<string>('');

  const empresaId = empresaSel || empresas[0]?.id || '';
  const empresaFixaId = empresas.length === 1 ? empresas[0]?.id : null;

  const { webhooks, loading, create, update, toggleAtivo, rotateSecret, creating, updating } =
    useWebhookConfigs(empresaId);

  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebhookConfig | null>(null);

  const [rotateFor, setRotateFor] = useState<WebhookConfig | null>(null);
  const [testFor, setTestFor] = useState<WebhookConfig | null>(null);

  const filtrados = useMemo(() => {
    return webhooks.filter((w) => {
      const q = busca.trim().toLowerCase();
      if (q && !w.nome.toLowerCase().includes(q) && !w.url_destino.toLowerCase().includes(q)) return false;
      if (statusFiltro === 'ativo' && !w.ativo) return false;
      if (statusFiltro === 'inativo' && w.ativo) return false;
      return true;
    });
  }, [webhooks, busca, statusFiltro]);

  const openNovo = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (w: WebhookConfig) => {
    setEditing(w);
    setModalOpen(true);
  };

  const handleSubmit = async (values: WebhookConfigInput) => {
    if (editing) {
      await update({ id: editing.id, patch: values });
    } else {
      await create(values);
    }
    setModalOpen(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
            <Webhook className="h-7 w-7" /> Webhooks
          </h1>
          <p className="text-muted-foreground">Configure integrações por webhook para sistemas externos.</p>
        </div>
        <Button onClick={openNovo} disabled={!empresaId}>
          <Plus className="h-4 w-4 mr-2" /> Novo Webhook
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {empresas.length > 1 && (
            <Select value={empresaSel} onValueChange={setEmpresaSel}>
              <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id!}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Input
            placeholder="Buscar por nome ou URL"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as 'todos' | 'ativo' | 'inativo')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Eventos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loading || loadingEmpresas) && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!loading && filtrados.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {webhooks.length === 0 ? 'Nenhum webhook cadastrado. Clique em “Novo Webhook”.' : 'Nenhum resultado com os filtros aplicados.'}
                </TableCell></TableRow>
              )}
              {filtrados.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.nome}</TableCell>
                  <TableCell className="max-w-[280px] truncate font-mono text-xs">{w.url_destino}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(w.eventos ?? []).slice(0, 3).map((ev) => (
                        <Badge key={ev} variant="secondary" className="font-mono text-[10px]">{ev}</Badge>
                      ))}
                      {(w.eventos ?? []).length > 3 && (
                        <Badge variant="outline">+{(w.eventos ?? []).length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.ativo ? 'default' : 'outline'} className={w.ativo ? 'bg-green-600 hover:bg-green-600' : ''}>
                      {w.ativo ? 'ATIVO' : 'INATIVO'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(w)}>
                          <Pencil className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleAtivo({ id: w.id, ativo: !w.ativo })}>
                          <Power className="h-4 w-4 mr-2" /> {w.ativo ? 'Inativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRotateFor(w)}>
                          <KeyRound className="h-4 w-4 mr-2" /> Rotacionar Secret
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTestFor(w)}>
                          <Shield className="h-4 w-4 mr-2" /> Testar Assinatura
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(w.url_destino);
                            toast.success('URL copiada');
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" /> Copiar URL
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {modalOpen && (
        <WebhookConfigModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          empresas={empresas as Array<{ id: string; nome: string }>}
          empresaFixaId={empresaFixaId}
          initial={editing}
          onSubmit={handleSubmit}
          submitting={creating || updating}
        />
      )}

      {rotateFor && (
        <RotateSecretDialog
          open={!!rotateFor}
          onOpenChange={(v) => !v && setRotateFor(null)}
          webhookNome={rotateFor.nome}
          onConfirm={async () => {
            return await rotateSecret(rotateFor.id);
          }}
        />
      )}

      {testFor && (
        <TestSignatureDialog
          open={!!testFor}
          onOpenChange={(v) => !v && setTestFor(null)}
          webhookNome={testFor.nome}
          secret={testFor.secret_token}
        />
      )}
    </div>
  );
};

export default Webhooks;
