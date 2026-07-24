import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import {
  WebhookConfig,
  WebhookConfigInput,
  WebhookConfigInputSchema,
  WebhookEvento,
  WEBHOOK_EVENTOS,
  generateSecretToken,
} from '@/types/webhookConfig';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresas: Array<{ id: string; nome: string }>;
  empresaFixaId?: string | null; // usuário comum: fixa; admin: undefined => selector
  initial?: WebhookConfig | null;
  onSubmit: (values: WebhookConfigInput) => Promise<void>;
  submitting?: boolean;
}

export const WebhookConfigModal: React.FC<Props> = ({
  open,
  onOpenChange,
  empresas,
  empresaFixaId,
  initial,
  onSubmit,
  submitting,
}) => {
  const [showSecret, setShowSecret] = useState(false);

  const defaults = useMemo<WebhookConfigInput>(
    () => ({
      nome: initial?.nome ?? '',
      descricao: initial?.descricao ?? '',
      url_destino: initial?.url_destino ?? 'https://',
      metodo: (initial?.metodo as 'POST' | 'PUT') ?? 'POST',
      secret_token: initial?.secret_token ?? '',
      eventos: initial?.eventos ?? [],
      max_tentativas: initial?.max_tentativas ?? 5,
      timeout_segundos: initial?.timeout_segundos ?? 10,
      ativo: initial?.ativo ?? true,
      empresa_representada_id:
        initial?.empresa_representada_id ?? empresaFixaId ?? empresas[0]?.id ?? '',
    }),
    [initial, empresaFixaId, empresas],
  );

  const form = useForm<WebhookConfigInput>({
    resolver: zodResolver(WebhookConfigInputSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
  }, [defaults, form]);

  const eventosSelecionados = form.watch('eventos') ?? [];
  const secretValue = form.watch('secret_token') ?? '';

  const toggleEvento = (ev: WebhookEvento) => {
    const set = new Set(eventosSelecionados);
    if (set.has(ev)) set.delete(ev);
    else set.add(ev);
    form.setValue('eventos', Array.from(set), { shouldValidate: true });
  };

  const submit = async (values: WebhookConfigInput) => {
    await onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          {!empresaFixaId && (
            <div className="space-y-1">
              <Label>Empresa *</Label>
              <Select
                value={form.watch('empresa_representada_id')}
                onValueChange={(v) => form.setValue('empresa_representada_id', v, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id!}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.empresa_representada_id && (
                <p className="text-xs text-destructive">{form.formState.errors.empresa_representada_id.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input {...form.register('nome')} placeholder="Ex.: NOVUS_ERP" />
              {form.formState.errors.nome && (
                <p className="text-xs text-destructive">{form.formState.errors.nome.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Método</Label>
              <Select
                value={form.watch('metodo')}
                onValueChange={(v) => form.setValue('metodo', v as 'POST' | 'PUT', { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>URL de destino * (HTTPS)</Label>
            <Input {...form.register('url_destino')} placeholder="https://api.exemplo.com/webhook" />
            {form.formState.errors.url_destino && (
              <p className="text-xs text-destructive">{form.formState.errors.url_destino.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea {...form.register('descricao')} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Eventos *</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
              {WEBHOOK_EVENTOS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={eventosSelecionados.includes(ev)}
                    onCheckedChange={() => toggleEvento(ev)}
                  />
                  <span className="font-mono">{ev}</span>
                </label>
              ))}
            </div>
            {form.formState.errors.eventos && (
              <p className="text-xs text-destructive">{form.formState.errors.eventos.message as string}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Secret Token</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={secretValue ?? ''}
                  onChange={(e) => form.setValue('secret_token', e.target.value)}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.setValue('secret_token', generateSecretToken())}
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Gerar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Máx. Tentativas</Label>
              <Input type="number" {...form.register('max_tentativas', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Timeout (s)</Label>
              <Input type="number" {...form.register('timeout_segundos', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label>Ativo</Label>
              <p className="text-xs text-muted-foreground">Webhooks inativos não recebem eventos.</p>
            </div>
            <Switch
              checked={form.watch('ativo')}
              onCheckedChange={(v) => form.setValue('ativo', v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : initial ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
