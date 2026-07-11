// FIN-E2: Seção "Crédito e Pagamento" no cadastro do cliente
import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Ban, Loader2, Plus, X } from 'lucide-react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useClientePolitica } from '@/hooks/useClientePolitica';
import { usePagamentoModalidades } from '@/hooks/usePagamentoCatalogo';
import { limiteDisponivel, type ClientePoliticaStatus } from '@/types/clientePolitica';
import { cn } from '@/lib/utils';

const supabase: any = _supabase;

interface Props {
  clienteId: string;
  /** Permite visualizar os dados da política. */
  canView?: boolean;
  /** Permite editar limite/status/modalidades bloqueadas. */
  canEdit?: boolean;
  /** Permite fazer override quando cliente está BLOQUEADO. */
  canOverride?: boolean;
}

export const CreditoPagamentoSection: React.FC<Props> = ({
  clienteId,
  canView = true,
  canEdit = true,
  canOverride = false,
}) => {
  const { politica, modalidadesBloqueadas, loading, saving, salvar, bloquearModalidade, desbloquearModalidade } =
    useClientePolitica(clienteId);
  const { data: modalidades = [] } = usePagamentoModalidades(true);

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [permiteCrediario, setPermiteCrediario] = useState(false);
  const [limite, setLimite] = useState<string>('0');
  const [status, setStatus] = useState<ClientePoliticaStatus>('ATIVO');
  const [diasMaxAtraso, setDiasMaxAtraso] = useState<string>('');
  const [motivoBloqueio, setMotivoBloqueio] = useState<string>('');
  const [novaModalidadeId, setNovaModalidadeId] = useState<string>('');
  const [motivoBloq, setMotivoBloq] = useState<string>('');
  const [overrideAck, setOverrideAck] = useState(false);

  // Buscar empresa do cliente (usada em INSERT/RLS)
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.from('clientes').select('empresa_representada_id').eq('id', clienteId).maybeSingle();
      if (ativo) setEmpresaId(data?.empresa_representada_id ?? null);
    })();
    return () => { ativo = false; };
  }, [clienteId]);

  // Sincronizar estado local com política carregada
  useEffect(() => {
    if (politica) {
      setPermiteCrediario(politica.permite_crediario);
      setLimite(String(politica.limite_crediario ?? 0));
      setStatus(politica.status);
      setDiasMaxAtraso(politica.dias_max_atraso != null ? String(politica.dias_max_atraso) : '');
      setMotivoBloqueio(politica.motivo_bloqueio ?? '');
    }
  }, [politica]);

  const disponivel = useMemo(() => {
    const limiteNum = Number(limite || 0);
    const utilizado = Number(politica?.limite_utilizado ?? 0);
    return limiteDisponivel({ limite_crediario: limiteNum, limite_utilizado: utilizado });
  }, [limite, politica]);

  const modalidadesDisponiveis = useMemo(() => {
    const bloqSet = new Set(modalidadesBloqueadas.map((m) => m.modalidade_id));
    return modalidades.filter((m) => !bloqSet.has(m.id));
  }, [modalidades, modalidadesBloqueadas]);

  const modalidadeNome = (id: string) => modalidades.find((m) => m.id === id)?.nome ?? id;

  const podeSalvar = canEdit && empresaId && !saving;
  const emBloqueio = status === 'BLOQUEADO';
  const overrideNecessario = emBloqueio && !canOverride;

  const handleSalvar = async () => {
    if (!empresaId) return;
    const limiteNum = Number(limite || 0);
    if (Number.isNaN(limiteNum) || limiteNum < 0) return;
    const dias = diasMaxAtraso.trim() ? Number(diasMaxAtraso) : null;

    await salvar({
      empresa_representada_id: empresaId,
      cliente_id: clienteId,
      permite_crediario: permiteCrediario,
      limite_crediario: limiteNum,
      dias_max_atraso: dias,
      status,
      motivo_bloqueio: emBloqueio ? motivoBloqueio || null : null,
    });
  };

  const handleAddBloqueio = async () => {
    if (!novaModalidadeId || !empresaId) return;
    const ok = await bloquearModalidade({
      empresa_representada_id: empresaId,
      modalidade_id: novaModalidadeId,
      motivo: motivoBloq || null,
    });
    if (ok) {
      setNovaModalidadeId('');
      setMotivoBloq('');
    }
  };

  if (!canView) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Crédito e Pagamento
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bloco 1: crediário + limite */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm font-medium">Permite crediário</Label>
                <p className="text-xs text-muted-foreground">Libera venda a prazo próprio para este cliente.</p>
              </div>
              <Switch
                checked={permiteCrediario}
                onCheckedChange={setPermiteCrediario}
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Limite de crediário (R$)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={limite}
              onChange={(e) => setLimite(e.target.value)}
              disabled={!canEdit || !permiteCrediario}
            />
            <p className="text-xs text-muted-foreground">
              Utilizado: R$ {Number(politica?.limite_utilizado ?? 0).toFixed(2)} · Disponível:{' '}
              <span className="font-medium">R$ {disponivel.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Bloco 2: status + dias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ClientePoliticaStatus)} disabled={!canEdit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATIVO">Ativo</SelectItem>
                <SelectItem value="EM_ANALISE">Em análise</SelectItem>
                <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Dias máx. de atraso</Label>
            <Input
              type="number"
              min={0}
              value={diasMaxAtraso}
              onChange={(e) => setDiasMaxAtraso(e.target.value)}
              disabled={!canEdit}
              placeholder="Ex.: 30"
            />
          </div>
          <div className="space-y-2 md:col-span-1">
            <Label>Motivo de bloqueio</Label>
            <Textarea
              rows={2}
              value={motivoBloqueio}
              onChange={(e) => setMotivoBloqueio(e.target.value)}
              disabled={!canEdit || !emBloqueio}
              placeholder={emBloqueio ? 'Informe o motivo…' : '—'}
            />
          </div>
        </div>

        {emBloqueio && (
          <div className={cn(
            'rounded-md border p-3 text-sm',
            'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
          )}>
            Cliente está <strong>BLOQUEADO</strong>. Vendas exigirão override auditado.
            {overrideNecessario && (
              <p className="mt-1 text-xs">
                Você não possui permissão de override — solicite ao responsável.
              </p>
            )}
            {canOverride && (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={overrideAck}
                  onChange={(e) => setOverrideAck(e.target.checked)}
                />
                Reconheço que qualquer venda futura será registrada como override.
              </label>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={handleSalvar} disabled={!podeSalvar}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar política
          </Button>
        </div>

        {/* Bloco 3: modalidades bloqueadas */}
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive" />
            <Label className="text-sm font-medium">Modalidades bloqueadas para este cliente</Label>
          </div>

          <div className="flex flex-wrap gap-2">
            {modalidadesBloqueadas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma modalidade bloqueada.</p>
            )}
            {modalidadesBloqueadas.map((mb) => (
              <Badge key={mb.id} variant="destructive" className="flex items-center gap-1">
                {modalidadeNome(mb.modalidade_id)}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => desbloquearModalidade(mb.modalidade_id)}
                    className="ml-1 hover:opacity-80"
                    aria-label="Desbloquear"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>

          {canEdit && (
            <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_auto] gap-2">
              <Select value={novaModalidadeId} onValueChange={setNovaModalidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar modalidade…" />
                </SelectTrigger>
                <SelectContent>
                  {modalidadesDisponiveis.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Motivo (opcional)"
                value={motivoBloq}
                onChange={(e) => setMotivoBloq(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleAddBloqueio} disabled={!novaModalidadeId}>
                <Plus className="h-4 w-4 mr-1" />
                Bloquear
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
